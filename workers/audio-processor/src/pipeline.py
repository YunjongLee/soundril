"""
Audio processing pipeline.
Ported from lrc-generator/generate.py.
"""

import asyncio
import os
import re
import subprocess
import tempfile
from difflib import SequenceMatcher
from pathlib import Path

from .logger import get_logger

logger = get_logger("pipeline")


# ── Model caches (persist across requests on same Cloud Run instance) ──

_separator = None
_whisper_model = None
_whisper_device = None
_align_models: dict = {}

BS_ROFORMER_MODEL = "model_bs_roformer_ep_368_sdr_12.9628.ckpt"
MODEL_DIR = os.environ.get(
    "AUDIO_SEPARATOR_MODEL_DIR",
    str(Path.home() / ".cache" / "audio-separator"),
)


def detect_device() -> str:
    import torch
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def _get_separator():
    global _separator
    if _separator is None:
        from audio_separator.separator import Separator
        logger.info(f"Loading BS-Roformer model from {MODEL_DIR}...")
        _separator = Separator(
            log_level=30,
            model_file_dir=MODEL_DIR,
            output_format="WAV",
        )
        _separator.load_model(model_filename=BS_ROFORMER_MODEL)
        logger.info("BS-Roformer model loaded")
    return _separator


def _get_whisper_model(device: str):
    global _whisper_model, _whisper_device
    if _whisper_model is None or _whisper_device != device:
        import whisperx
        logger.info(f"Loading Whisper model (device={device})...")
        _whisper_model = whisperx.load_model(
            "large-v3", device,
            compute_type="float16" if device == "cuda" else "float32",
            vad_options={"vad_onset": 0.05, "vad_offset": 0.02},
        )
        _whisper_device = device
        logger.info("Whisper model loaded")
    return _whisper_model


def _get_align_model(lang: str, device: str):
    key = f"{lang}_{device}"
    if key not in _align_models:
        import whisperx
        logger.info(f"Loading alignment model for {lang}...")
        _align_models[key] = whisperx.load_align_model(language_code=lang, device=device)
        logger.info(f"Alignment model for {lang} loaded")
    return _align_models[key]


# ──────────────────────────────────────────────
# 1. Vocal Separation (BS-Roformer via audio-separator)
# ──────────────────────────────────────────────

def separate_vocals(audio_path: str, output_dir: str) -> tuple[str, str]:
    """BS-Roformer로 보컬/MR 분리. Returns: (vocals_wav_path, mr_wav_path)"""
    logger.info("BS-Roformer: separating vocals...")

    separator = _get_separator()
    # audio-separator가 load_model 시점의 output_dir을 내부 model_instance에 스냅샷함.
    # 리퀘스트마다 다른 work_dir로 내보내려면 양쪽 다 갱신해야 함.
    separator.output_dir = output_dir
    if getattr(separator, "model_instance", None) is not None:
        separator.model_instance.output_dir = output_dir

    output_filenames = separator.separate(audio_path)
    mr_fn = next(fn for fn in output_filenames if "(Instrumental)" in fn)
    vocals_fn = next(fn for fn in output_filenames if "(Vocals)" in fn)

    vocals_path = str(Path(output_dir) / vocals_fn)
    mr_path = str(Path(output_dir) / mr_fn)

    logger.info("BS-Roformer: separation complete")
    return vocals_path, mr_path


def pitch_shift_audio(input_path: str, output_path: str, semitones: int):
    """피치 시프트 (템포 유지). rubberband CLI → ffmpeg asetrate fallback."""
    pitch_ratio = 2 ** (semitones / 12)
    logger.info(f"Pitch shifting: {semitones:+d} semitones (ratio={pitch_ratio:.4f})")

    # ffmpeg로 WAV 변환 (rubberband CLI는 WAV만 지원)
    wav_input = output_path.replace(".wav", "_tmp.wav")
    subprocess.run([
        "ffmpeg", "-y", "-i", input_path, "-ar", "44100", "-ac", "2", wav_input,
    ], check=True, capture_output=True, timeout=120)

    # Primary: rubberband CLI R3 (Finer engine, 트랜지언트/하모닉 보존 우수)
    try:
        subprocess.run([
            "rubberband", "-3", "-p", str(semitones), wav_input, output_path,
        ], check=True, capture_output=True, timeout=180)
        os.remove(wav_input)
        logger.info("Pitch shift complete (rubberband R3)")
        return
    except (subprocess.CalledProcessError, FileNotFoundError):
        logger.info("Rubberband CLI unavailable, falling back to asetrate+atempo")

    # Fallback: ffmpeg asetrate + aresample + atempo
    tempo_ratio = 1 / pitch_ratio
    subprocess.run([
        "ffmpeg", "-y", "-i", wav_input,
        "-af", f"asetrate=44100*{pitch_ratio},aresample=44100,atempo={tempo_ratio}",
        output_path,
    ], check=True, capture_output=True, timeout=120)
    os.remove(wav_input)
    logger.info("Pitch shift complete (asetrate+atempo fallback)")


def normalize_audio(input_path: str, output_path: str):
    """전사 전 loudness normalize. 조용한 보컬 구간의 VAD 감지 개선."""
    subprocess.run([
        "ffmpeg", "-y", "-i", input_path,
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        output_path,
    ], check=True, capture_output=True)
    logger.info("Audio normalized for transcription")


def encode_mp3(wav_path: str, mp3_path: str, bitrate: str = "320k", cover_path: str | None = None):
    """WAV → MP3 encoding via ffmpeg. 앨범 아트가 있으면 임베딩."""
    if cover_path and Path(cover_path).exists():
        cmd = [
            "ffmpeg", "-y",
            "-i", wav_path,
            "-i", cover_path,
            "-map", "0:a", "-map", "1:0",
            "-c:a", "libmp3lame", "-b:a", bitrate,
            "-c:v", "mjpeg",
            "-id3v2_version", "3",
            "-metadata:s:v", "title=Album cover",
            "-metadata:s:v", "comment=Cover (front)",
            mp3_path,
        ]
    else:
        cmd = ["ffmpeg", "-y", "-i", wav_path, "-b:a", bitrate, mp3_path]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg encoding failed: {result.stderr[:300]}")


# ──────────────────────────────────────────────
# 2. WhisperX (Whisper + wav2vec2 forced alignment)
# ──────────────────────────────────────────────

def _detect_word_language(word: str) -> str:
    """단어의 언어를 첫 번째 문자로 판단."""
    for c in word:
        if '\uac00' <= c <= '\ud7a3' or '\u3131' <= c <= '\u318e':
            return "ko"
        if '\u3040' <= c <= '\u309f' or '\u30a0' <= c <= '\u30ff':
            return "ja"
        if '\u4e00' <= c <= '\u9fff':
            return "zh"
        if c.isascii() and c.isalpha():
            return "en"
    return "ko"


def _detect_languages(segments: list) -> list[str]:
    """세그먼트들에서 사용된 언어 목록 반환. 글자 수 많은 순."""
    counts: dict[str, int] = {}
    for seg in segments:
        for c in seg.get("text", ""):
            if '\uac00' <= c <= '\ud7a3':
                counts["ko"] = counts.get("ko", 0) + 1
            elif c.isascii() and c.isalpha():
                counts["en"] = counts.get("en", 0) + 1
            elif '\u3040' <= c <= '\u309f' or '\u30a0' <= c <= '\u30ff':
                counts["ja"] = counts.get("ja", 0) + 1
            elif '\u4e00' <= c <= '\u9fff':
                counts["zh"] = counts.get("zh", 0) + 1
    if not counts:
        return ["ko"]
    return sorted(counts.keys(), key=lambda k: counts[k], reverse=True)


def _detect_primary_language(text: str) -> str | None:
    """텍스트에서 주 언어 하나 반환. 판단 불가능하면 None.

    영어는 최후순위. ko/ja/zh가 1자라도 있으면 그 중 dominant 반환.
    영어 후렴 반복으로 한국어 verse char 수가 압도당해 ko가 en으로 잡히는 케이스 방지.
    WhisperX는 hint를 강제가 아닌 우선순위로 사용하므로 ko hint에서도 영어는 정상 인식됨.
    """
    counts: dict[str, int] = {}
    for c in text:
        if '\uac00' <= c <= '\ud7a3':
            counts["ko"] = counts.get("ko", 0) + 1
        elif c.isascii() and c.isalpha():
            counts["en"] = counts.get("en", 0) + 1
        elif '\u3040' <= c <= '\u309f' or '\u30a0' <= c <= '\u30ff':
            counts["ja"] = counts.get("ja", 0) + 1
        elif '\u4e00' <= c <= '\u9fff':
            counts["zh"] = counts.get("zh", 0) + 1
    if not counts:
        return None
    non_en = {k: v for k, v in counts.items() if k != "en"}
    if non_en:
        return max(non_en, key=non_en.get)
    return "en"


def _split_language_runs(text: str) -> list[tuple[str, list[str]]]:
    """텍스트를 언어별 연속 구간(런)으로 분할."""
    runs: list[tuple[str, list[str]]] = []
    for w in text.split():
        lang = _detect_word_language(w)
        if runs and runs[-1][0] == lang:
            runs[-1][1].append(w)
        else:
            runs.append((lang, [w]))
    return runs


def _extract_words(segments: list) -> list[dict]:
    """세그먼트에서 워드 리스트 추출 (0.00s 타임스탬프 제외)."""
    words = []
    for seg in segments:
        for w in seg.get("words", []):
            word = w.get("word", "").strip()
            start = w.get("start", 0)
            end = w.get("end", 0)
            if word and (start > 0 or end > 0):
                words.append({"word": word, "start": start, "end": end})
    return words


def _align_segment_multilang(seg: dict, audio, device: str,
                             align_models: dict, depth: int = 0) -> list:
    """세그먼트를 재귀적으로 다국어 정렬."""
    import whisperx

    text = seg.get("text", "").strip()
    if not text:
        return []

    runs = _split_language_runs(text)

    # 단일 언어: 바로 정렬
    if len(runs) == 1:
        lang = runs[0][0]
        if lang not in align_models:
            return []
        model, meta = align_models[lang]
        aligned = whisperx.align([seg], model, meta, audio, device)
        return _extract_words(aligned["segments"])

    # 다국어: 첫 번째 런만 정렬
    first_lang = runs[0][0]
    if first_lang not in align_models:
        return []

    model, meta = align_models[first_lang]
    aligned = whisperx.align([seg], model, meta, audio, device)
    aligned_words = _extract_words(aligned["segments"])

    # 첫 런 단어 수집
    first_run_count = len(runs[0][1])
    first_run_words = []
    last_ts_end = seg["start"]

    for w in aligned_words[:first_run_count]:
        first_run_words.append(w)
        if w["end"] > last_ts_end:
            last_ts_end = w["end"]

    # 나머지 텍스트로 서브세그먼트 → 재귀
    remaining_text_parts = []
    for _, run_words in runs[1:]:
        remaining_text_parts.extend(run_words)

    if remaining_text_parts and last_ts_end < seg["end"]:
        sub_seg = {
            "start": last_ts_end,
            "end": seg["end"],
            "text": " ".join(remaining_text_parts),
        }
        remaining_result = _align_segment_multilang(
            sub_seg, audio, device, align_models, depth + 1
        )
        return first_run_words + remaining_result

    return first_run_words


def transcribe(audio_path: str, language_hint: str | None = None) -> tuple[list[dict], list[dict]]:
    """WhisperX 전사 + 다국어 wav2vec2 forced alignment.

    language_hint가 주어지면 Whisper 자동 감지를 건너뛰고 해당 언어로 전사.
    (intro가 긴 곡에서 첫 30초 자동 감지 오판을 방지)

    Returns: (words, segments) — segments는 [{"start", "end", "text"}, ...]
    """
    import whisperx

    device = detect_device()

    # 오디오를 한 번만 로드해서 transcribe/align 양쪽에 재사용
    audio = whisperx.load_audio(audio_path)

    logger.info(f"WhisperX: transcribing on {device} (language_hint={language_hint})...")
    model = _get_whisper_model(device)
    transcribe_kwargs = {"batch_size": 16}
    if language_hint:
        transcribe_kwargs["language"] = language_hint
    result = model.transcribe(audio, **transcribe_kwargs)
    raw_segments = result.get("segments", [])
    detected_lang = result.get("language", "ko")
    logger.info(f"WhisperX: {len(raw_segments)} segments transcribed (language: {detected_lang})")
    segment_meta = [
        {"start": seg.get("start", 0.0), "end": seg.get("end", 0.0), "text": seg.get("text", "")}
        for seg in raw_segments
    ]
    for i, seg in enumerate(segment_meta):
        logger.info(f"  seg[{i}] [{seg['start']:.2f}s~{seg['end']:.2f}s] {seg['text']}")

    # 언어 감지
    langs = _detect_languages(raw_segments)
    logger.info(f"WhisperX: detected languages: {', '.join(langs)}")

    # 단일 언어: 전체 한번에 정렬
    if len(langs) <= 1:
        align_model, metadata = _get_align_model(langs[0], device)
        aligned = whisperx.align(raw_segments, align_model, metadata, audio, device)
        words = _extract_words(aligned["segments"])
        for w in words:
            logger.info(f"  word [{w['start']:6.2f}s~{w['end']:6.2f}s] {w['word']}")
        logger.info(f"WhisperX: {len(words)} words aligned (single language)")
        return words, segment_meta

    # 다국어: 언어별 모델 로드 + 세그먼트별 재귀 정렬
    align_models = {}
    for lang in langs:
        align_models[lang] = _get_align_model(lang, device)

    all_words = []
    for seg in raw_segments:
        if not seg.get("text", "").strip():
            continue
        seg_words = _align_segment_multilang(seg, audio, device, align_models)
        all_words.extend(seg_words)

    all_words.sort(key=lambda w: w["start"])
    for w in all_words:
        logger.info(f"  word [{w['start']:6.2f}s~{w['end']:6.2f}s] {w['word']}")
    logger.info(f"WhisperX: {len(all_words)} words aligned (multilingual: {', '.join(langs)})")
    return all_words, segment_meta


# ──────────────────────────────────────────────
# 3. Text Alignment
# ──────────────────────────────────────────────

def normalize(text: str) -> str:
    """비교용 정규화: 공백/특수문자 제거, 소문자화."""
    return re.sub(r'[^\w]', '', text.lower())


def _split_line_for_matching(line: str) -> list[str]:
    """라인을 매칭용 토큰으로 분해.

    ja/zh는 wav2vec2가 char 단위로 정렬하므로 글자 단위 분해.
    ko/en 등은 공백 분리 어절.
    """
    lang = _detect_primary_language(line)
    if lang in ("ja", "zh"):
        return [c for c in line if not c.isspace()]
    return line.split()


def _filter_hallucinated_words(
    whisper_words: list[dict],
    segments: list[dict],
    lyrics_text: str,
    n: int = 3,
    threshold: float = 0.3,
) -> list[dict]:
    """가사와 관련 없는 Whisper 세그먼트(hallucination)를 제거.

    Whisper는 무음/간주 구간에서 학습 데이터 상용구를 만들어내는 경향이 있음
    (일본어: "ご視聴ありがとうございました", 영어: "Thank you for watching" 등).
    각 segment의 normalized n-gram이 가사 전체에 포함되는 비율이 threshold 미만이면
    hallucination으로 간주하고, 해당 segment 시간 범위의 word들을 제거.
    """
    lyrics_norm = normalize(lyrics_text)
    if not lyrics_norm or not segments:
        return whisper_words

    bad_ranges: list[tuple[float, float]] = []
    for seg in segments:
        seg_norm = normalize(seg.get("text", ""))
        if len(seg_norm) < n:
            continue
        n_grams = [seg_norm[i:i + n] for i in range(len(seg_norm) - n + 1)]
        matched = sum(1 for g in n_grams if g in lyrics_norm)
        ratio = matched / len(n_grams)
        if ratio < threshold:
            bad_ranges.append((seg["start"], seg["end"]))
            logger.info(
                f"  Hallucination filtered [{seg['start']:.2f}s~{seg['end']:.2f}s] "
                f"'{seg.get('text','')}' (n-gram match {matched}/{len(n_grams)}={ratio:.2f})"
            )

    if not bad_ranges:
        return whisper_words

    def in_bad_range(w: dict) -> bool:
        for s, e in bad_ranges:
            if s <= w["start"] < e:
                return True
        return False

    cleaned = [w for w in whisper_words if not in_bad_range(w)]
    logger.info(f"  Filtered {len(whisper_words) - len(cleaned)} words from hallucinated segments")
    return cleaned


def align_lyrics(
    whisper_words: list[dict],
    lyrics_lines: list[str],
    segments: list[dict] | None = None,
) -> list[tuple]:
    """워드 레벨 순차 매칭: 라인의 모든 단어를 매칭하여 가장 앞 타임스탬프 사용.

    segments가 주어지면 가사와 무관한 hallucination 세그먼트를 먼저 제거.
    """
    if segments:
        whisper_words = _filter_hallucinated_words(
            whisper_words, segments, "\n".join(lyrics_lines)
        )

    w_norms = [normalize(w["word"]) for w in whisper_words]
    results = []
    w_cursor = 0

    # 후렴 반복 곡에서 같은 단어가 멀리 있는 다음 반복으로 점프하지 않도록 cursor 가까운 매칭을 우선.
    # 0.03이면 13워드 떨어진 1.0 점수가 거리 0의 0.667 점수를 못 이긴다.
    distance_penalty = 0.03

    for line_idx, line in enumerate(lyrics_lines):
        line_words = _split_line_for_matching(line)
        if not line_words:
            results.append((None, line))
            continue

        remaining_lines = len(lyrics_lines) - line_idx
        remaining_words = len(whisper_words) - w_cursor
        max_search = min(remaining_words, max(20, remaining_words * 3 // max(remaining_lines, 1)))
        search_end = min(w_cursor + max_search, len(whisper_words))

        lw_norms = [normalize(lw) for lw in line_words]
        significant_count = sum(1 for n in lw_norms if n)

        # ja/zh는 char-level 매칭이라 1글자 token이 많아 거리 페널티가 부작용을 낳음.
        is_char_level = _detect_primary_language(line) in ("ja", "zh")
        line_penalty = 0.0 if is_char_level else distance_penalty

        # Phase 1: 연속 가사 단어를 합쳐서 단일 Whisper 단어에 매칭
        # (예: 가사 "사랑 합니다" → Whisper "사랑합니다")
        concat_matches = []  # (start_lw, end_lw, whisper_idx, score)
        for start_lw in range(len(lw_norms)):
            if not lw_norms[start_lw]:
                continue
            for end_lw in range(start_lw + 1, min(start_lw + 4, len(lw_norms))):
                concat = ''.join(lw_norms[start_lw:end_lw + 1])
                if len(concat) < 2:
                    continue
                best_wi, best_score, best_eff = -1, 0.0, float('-inf')
                for i in range(w_cursor, search_end):
                    if not w_norms[i]:
                        continue
                    score = SequenceMatcher(None, concat, w_norms[i], autojunk=False).ratio()
                    eff = score - (i - w_cursor) * line_penalty
                    if eff > best_eff:
                        best_eff = eff
                        best_score = score
                        best_wi = i
                if best_score >= 0.9 and best_wi >= 0:
                    concat_matches.append((start_lw, end_lw, best_wi, best_score))

        # 점수 높은 순으로 정렬, 겹치지 않는 매칭만 선택
        concat_matches.sort(key=lambda x: -x[3])
        used_lw = set()
        word_matches = []  # (line_word_idx, whisper_idx, score)
        for cm in concat_matches:
            lw_range = set(range(cm[0], cm[1] + 1))
            if lw_range & used_lw:
                continue
            used_lw |= lw_range
            # concat 매칭은 lw range 전체를 cover → ratio 계산을 위해 각 lw마다 entry 추가
            for lw_idx in range(cm[0], cm[1] + 1):
                if lw_norms[lw_idx]:
                    word_matches.append((lw_idx, cm[2], cm[3]))

        # Phase 2: 개별 단어 매칭 (합쳐서 매칭된 단어는 건너뜀)
        for lw_idx, lw in enumerate(line_words):
            lw_norm = lw_norms[lw_idx]
            if not lw_norm or lw_idx in used_lw:
                continue
            # 1글자: exact match, 2글자: 0.7, 3글자+: 0.65
            min_score = 1.0 if len(lw_norm) < 2 else (0.65 if len(lw_norm) >= 3 else 0.7)
            best_idx, best_score, best_eff = -1, 0.0, float('-inf')
            for i in range(w_cursor, search_end):
                if not w_norms[i]:
                    continue
                score = SequenceMatcher(None, lw_norm, w_norms[i], autojunk=False).ratio()
                eff = score - (i - w_cursor) * distance_penalty
                if eff > best_eff:
                    best_eff = eff
                    best_score = score
                    best_idx = i
            if best_score >= min_score and best_idx >= 0:
                word_matches.append((lw_idx, best_idx, best_score))

        if word_matches:
            # 모든 시작점에서 가장 긴 (lw 순) wi 비감소 subset 탐색 (LIS-like).
            # 멀리 있는 단일 매칭이 가까운 다수 매칭을 단조증가 필터로 막지 않도록.
            # 같은 wi에 여러 lw 매칭(concat) 허용을 위해 `>=` 사용.
            max_span = significant_count * 2
            matches_sorted = sorted(word_matches, key=lambda x: x[0])
            ordered = []
            for start in range(len(matches_sorted)):
                cur = [matches_sorted[start]]
                first_wi = cur[0][1]
                last_wi_iter = first_wi
                for m in matches_sorted[start + 1:]:
                    if m[1] >= last_wi_iter and m[1] - first_wi <= max_span:
                        cur.append(m)
                        last_wi_iter = m[1]
                if len(cur) > len(ordered):
                    ordered = cur

            if ordered:
                first_wi = ordered[0][1]
                last_wi = ordered[-1][1]
                cursor_advance = last_wi - w_cursor
                match_ratio = len(ordered) / significant_count if significant_count > 0 else 1.0

                # 매칭 비율이 낮은데 cursor가 과도하게 전진하면 오매칭으로 판단
                # ja/zh는 char-level이라 매칭 가능한 비율이 본질적으로 낮음 → 임계값 완화
                # ko/en은 경계 포함(`<=`)으로 약간 더 엄격: 2단어 라인 중 1개만 매칭된 케이스(=0.5)도 잡힘
                miss_threshold = 0.2 if is_char_level else 0.5
                ratio_below = match_ratio < miss_threshold if is_char_level else match_ratio <= miss_threshold
                weak = ratio_below and cursor_advance > len(ordered) * 2

                # 첫 토큰 anchor: char-level인데 라인의 첫 char(또는 첫 2개)가 ordered에 없고
                # 매칭 비율도 낮으면 라인 시작점을 신뢰할 수 없음 → MISS
                first_token_idx = next((i for i, n in enumerate(lw_norms) if n), None)
                second_token_idx = next((i for i, n in enumerate(lw_norms) if n and i > (first_token_idx or -1)), None)
                anchor_indices = {idx for idx in (first_token_idx, second_token_idx) if idx is not None}
                first_anchor_matched = any(m[0] in anchor_indices for m in ordered)
                no_anchor = is_char_level and not first_anchor_matched and match_ratio < 0.5

                if weak or no_anchor:
                    results.append((None, line))
                    reason = "weak" if weak else "no first-char anchor"
                    logger.info(f"  MISS  [  ?.??s] '{line}' ({reason} {len(ordered)}/{significant_count} words, advance={cursor_advance}, cursor={w_cursor})")
                else:
                    timestamp = whisper_words[first_wi]["start"]
                    results.append((timestamp, line))
                    logger.info(f"  MATCH [{timestamp:6.2f}s] '{line}' ← first='{whisper_words[first_wi]['word']}' last='{whisper_words[last_wi]['word']}' ({len(ordered)} words, cursor={w_cursor}→{last_wi})")
                    w_cursor = last_wi + 1
            else:
                results.append((None, line))
                logger.info(f"  MISS  [  ?.??s] '{line}' (no ordered matches, cursor={w_cursor})")
        else:
            results.append((None, line))
            logger.info(f"  MISS  [  ?.??s] '{line}' (no matches >= 0.7, cursor={w_cursor})")


    # 첫 라인 anchor: 첫 매칭 이전에 MISS 라인이 있으면, 라인 0의 시간을 Whisper 첫 word 시간으로
    # 고정 (그 사이 라인들은 일반 보간 로직이 채움). 첫 매칭 라인까지 균등 분할 안 해도 됨.
    first_match_idx = next((i for i, (t, _) in enumerate(results) if t is not None), None)
    if first_match_idx is not None and first_match_idx > 0 and whisper_words and results[0][0] is None:
        results[0] = (whisper_words[0]["start"], results[0][1])
        logger.info(f"  ANCHOR [{whisper_words[0]['start']:6.2f}s] line[0] '{results[0][1]}' (Whisper first word)")

    # 누락된 타임스탬프 보간
    for i in range(len(results)):
        if results[i][0] is not None:
            continue
        prev_t = next((results[j][0] for j in range(i - 1, -1, -1) if results[j][0] is not None), 0.0)
        next_info = next(((j, results[j][0]) for j in range(i + 1, len(results)) if results[j][0] is not None), None)
        if next_info:
            next_j, next_t = next_info
            gap = next_j - i
            for k, j in enumerate(range(i, next_j)):
                if results[j][0] is None:
                    results[j] = (prev_t + (next_t - prev_t) * (k + 1) / (gap + 1), results[j][1])
        else:
            results[i] = (prev_t + 2.0, results[i][1])

    return results


def generate_lrc(aligned: list[tuple]) -> str:
    """LRC 문자열 생성."""
    lines = []
    for start, text in aligned:
        minutes = int(start // 60)
        secs = start % 60
        lines.append(f"[{minutes:02d}:{secs:05.2f}]{text}")
    return "\n".join(lines)


# ──────────────────────────────────────────────
# Main Pipeline
# ──────────────────────────────────────────────

async def process_job(
    job_id: str,
    user_id: str,
    job_type: str,
    input_storage_path: str,
    lyrics: str | None = None,
    cover_storage_path: str | None = None,
    key_shift: int = 0,
) -> dict:
    """Main processing pipeline. Returns dict with result storage paths."""
    from .storage import download_file, upload_file, update_job_progress
    work_dir = tempfile.mkdtemp(prefix=f"soundril_{job_id}_")
    result = {}

    try:
        # Download input file
        input_filename = Path(input_storage_path).name
        local_input = str(Path(work_dir) / input_filename)
        logger.info(f"Downloading {input_storage_path}...")
        await download_file(input_storage_path, local_input)

        # Download cover art if available
        local_cover: str | None = None
        if cover_storage_path:
            local_cover = str(Path(work_dir) / "cover.jpg")
            try:
                await download_file(cover_storage_path, local_cover)
                logger.info("Cover art downloaded")
            except Exception:
                local_cover = None
                logger.info("Cover art not found, skipping")

        await update_job_progress(job_id, 5, "Preparing audio...")

        # Step 1: Vocal separation (only when MR requested or lrc_mr)
        vocals_path = None
        if job_type in ("mr", "lrc_mr"):
            await update_job_progress(job_id, 10, "Separating vocals and instrumentals...")
            vocals_path, mr_path = await asyncio.to_thread(
                separate_vocals, local_input, work_dir
            )
            await update_job_progress(job_id, 30, "Separation complete")

            # Key shift (MR only)
            if key_shift != 0:
                await update_job_progress(job_id, 31, f"Pitch shifting ({key_shift:+d})...")
                pitched_path = str(Path(work_dir) / "mr_pitched.wav")
                await asyncio.to_thread(pitch_shift_audio, mr_path, pitched_path, key_shift)
                mr_path = pitched_path

            mr_mp3 = str(Path(work_dir) / "mr.mp3")
            vocals_mp3 = str(Path(work_dir) / "vocals.mp3")

            # Parallel MP3 encoding (two ffmpeg processes)
            await asyncio.gather(
                asyncio.to_thread(encode_mp3, mr_path, mr_mp3, "320k", local_cover),
                asyncio.to_thread(encode_mp3, vocals_path, vocals_mp3, "320k", local_cover),
            )
            await update_job_progress(job_id, 33, "Uploading tracks...")

            # Parallel upload
            mr_storage = f"results/{user_id}/{job_id}/mr.mp3"
            vocals_storage = f"results/{user_id}/{job_id}/vocals.mp3"
            await asyncio.gather(
                upload_file(mr_mp3, mr_storage),
                upload_file(vocals_mp3, vocals_storage),
            )
            result["mrStoragePath"] = mr_storage
            result["vocalsStoragePath"] = vocals_storage
            await update_job_progress(job_id, 35, "Tracks ready")

        # Step 1.5: Key shift only (no separation)
        if job_type == "key" and key_shift != 0:
            await update_job_progress(job_id, 10, f"Pitch shifting ({key_shift:+d})...")
            pitched_path = str(Path(work_dir) / "pitched.wav")
            await asyncio.to_thread(pitch_shift_audio, local_input, pitched_path, key_shift)
            await update_job_progress(job_id, 50, "Encoding...")

            output_mp3 = str(Path(work_dir) / "output.mp3")
            await asyncio.to_thread(encode_mp3, pitched_path, output_mp3, "320k", local_cover)
            await update_job_progress(job_id, 80, "Uploading...")

            output_storage = f"results/{user_id}/{job_id}/output.mp3"
            await upload_file(output_mp3, output_storage)
            result["outputStoragePath"] = output_storage
            await update_job_progress(job_id, 90, "Done")

        # Step 2: Transcription + alignment
        if job_type in ("lrc", "lrc_mr"):
            audio_for_transcribe = vocals_path or local_input

            # 전사 전 loudness normalize (VAD 감지 개선)
            normalized_path = str(Path(work_dir) / "vocals_normalized.wav")
            await asyncio.to_thread(normalize_audio, audio_for_transcribe, normalized_path)
            audio_for_transcribe = normalized_path

            # Reference 가사에서 주 언어 추정 → Whisper 자동 감지 오판 방지
            language_hint = _detect_primary_language(lyrics) if lyrics else None
            if language_hint:
                logger.info(f"Language hint from reference lyrics: {language_hint}")

            await update_job_progress(job_id, 40, "Recognizing speech...")
            words, segments = await asyncio.to_thread(transcribe, audio_for_transcribe, language_hint)
            await update_job_progress(job_id, 60, "Speech recognized")

            # Step 3: Lyrics alignment
            if lyrics:
                lyrics_lines = [l.strip() for l in lyrics.strip().splitlines() if l.strip()]
                await update_job_progress(job_id, 65, "Syncing lyrics to audio...")
                aligned = align_lyrics(words, lyrics_lines, segments=segments)
                await update_job_progress(job_id, 80, "Lyrics synced")

                # Generate and upload LRC
                lrc_content = generate_lrc(aligned)
                lrc_path = str(Path(work_dir) / "output.lrc")
                with open(lrc_path, "w", encoding="utf-8") as f:
                    f.write(lrc_content)

                lrc_storage_path = f"results/{user_id}/{job_id}/output.lrc"
                await upload_file(lrc_path, lrc_storage_path)
                result["lrcStoragePath"] = lrc_storage_path
                await update_job_progress(job_id, 90, "Almost done...")

        # Upload processing log
        log_storage_path = f"logs/{user_id}/{job_id}/process.log"
        log_path = str(Path(work_dir) / "process.log")
        with open(log_path, "w") as f:
            f.write(f"Job {job_id} completed successfully\n")
        await upload_file(log_path, log_storage_path)
        result["logStoragePath"] = log_storage_path

        return result

    finally:
        import shutil
        shutil.rmtree(work_dir, ignore_errors=True)
