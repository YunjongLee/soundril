"""
Audio processing pipeline.
Ported from lrc-generator/generate.py.
"""

import asyncio
import re
import subprocess
import tempfile
from difflib import SequenceMatcher
from pathlib import Path

from .storage import download_file, upload_file, update_job_progress
from .logger import get_logger

logger = get_logger("pipeline")


# ── Model caches (persist across requests on same Cloud Run instance) ──

_demucs_model = None
_demucs_device = None
_whisper_model = None
_whisper_device = None
_align_models: dict = {}


def detect_device() -> str:
    import torch
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def _get_demucs_model(device: str):
    global _demucs_model, _demucs_device
    if _demucs_model is None or _demucs_device != device:
        from demucs.pretrained import get_model
        logger.info(f"Loading Demucs model (device={device})...")
        _demucs_model = get_model("htdemucs")
        _demucs_model.eval()
        _demucs_model.to(device)
        _demucs_device = device
        logger.info("Demucs model loaded")
    return _demucs_model


def _get_whisper_model(device: str):
    global _whisper_model, _whisper_device
    if _whisper_model is None or _whisper_device != device:
        import whisperx
        logger.info(f"Loading Whisper model (device={device})...")
        _whisper_model = whisperx.load_model(
            "large-v3-turbo", device,
            compute_type="float16" if device == "cuda" else "float32",
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
# 1. Vocal Separation (Demucs — Python API)
# ──────────────────────────────────────────────

def separate_vocals(audio_path: str, output_dir: str) -> tuple[str, str]:
    """Demucs htdemucs Python API로 보컬/MR 분리. Returns: (vocals_wav_path, mr_wav_path)"""
    import torch
    import torchaudio
    from demucs.apply import apply_model
    from demucs.audio import save_audio

    logger.info("Demucs: separating vocals...")
    device = detect_device()
    model = _get_demucs_model(device)

    # Load and preprocess audio
    wav, sr = torchaudio.load(audio_path)
    if wav.shape[0] == 1:
        wav = wav.repeat(2, 1)  # mono → stereo
    if sr != model.samplerate:
        wav = torchaudio.functional.resample(wav, sr, model.samplerate)

    # Normalize
    ref = wav.mean(0)
    wav = (wav - ref.mean()) / (ref.std() + 1e-8)

    # Separate
    with torch.no_grad():
        sources = apply_model(model, wav[None], device=device)[0]
    sources = sources.cpu()
    sources = sources * ref.std() + ref.mean()

    # Extract stems
    vocals_idx = model.sources.index("vocals")
    vocals = sources[vocals_idx]
    mr_indices = [i for i in range(len(model.sources)) if i != vocals_idx]
    mr = sources[mr_indices].sum(dim=0)

    vocals_path = str(Path(output_dir) / "vocals.wav")
    mr_path = str(Path(output_dir) / "no_vocals.wav")
    save_audio(vocals, vocals_path, model.samplerate)
    save_audio(mr, mr_path, model.samplerate)

    logger.info("Demucs: separation complete")
    return vocals_path, mr_path


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
# 2. WhisperX (Whisper + wav2vec2 multilingual alignment)
# ──────────────────────────────────────────────

def detect_word_language(word: str) -> str:
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


def detect_languages(segments: list) -> list[str]:
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
        return ["en"]
    return sorted(counts.keys(), key=lambda k: counts[k], reverse=True)


def extract_words(segments: list) -> list[dict]:
    """세그먼트에서 워드 리스트 추출."""
    words = []
    for seg in segments:
        for w in seg.get("words", []):
            word = w.get("word", "").strip()
            if word:
                words.append({
                    "word": word,
                    "start": w.get("start", 0),
                    "end": w.get("end", 0),
                })
    return words


def split_language_runs(text: str) -> list[tuple[str, list[str]]]:
    """텍스트를 언어별 연속 구간(런)으로 분할."""
    runs: list[tuple[str, list[str]]] = []
    for w in text.split():
        lang = detect_word_language(w)
        if runs and runs[-1][0] == lang:
            runs[-1][1].append(w)
        else:
            runs.append((lang, [w]))
    return runs


def align_segment_recursive(seg: dict, audio_path: str, compute_device: str,
                            align_models: dict, depth: int = 0) -> list:
    """세그먼트를 재귀적으로 정렬.

    첫 번째 언어 런만 해당 언어 wav2vec2로 정렬하고,
    나머지는 서브세그먼트로 만들어 재귀 호출.
    CTC는 세그먼트 시작 부분만 정확하므로, 매 재귀마다
    시작 런을 벗겨서 모든 런이 정확하게 정렬됨.
    """
    import whisperx

    text = seg.get("text", "").strip()
    if not text:
        return []

    runs = split_language_runs(text)

    # 단일 언어: 바로 정렬
    if len(runs) == 1:
        lang = runs[0][0]
        if lang not in align_models:
            return []
        model, meta = align_models[lang]
        aligned = whisperx.align([seg], model, meta, audio_path, compute_device)
        return extract_words(aligned["segments"])

    # 다국어: 첫 번째 런만 정렬
    first_lang = runs[0][0]
    if first_lang not in align_models:
        return []

    model, meta = align_models[first_lang]
    aligned = whisperx.align([seg], model, meta, audio_path, compute_device)
    aligned_words = extract_words(aligned["segments"])

    # 첫 런 단어 수집 (타임스탬프 있는 것만)
    first_run_count = len(runs[0][1])
    first_run_words = []
    last_ts_end = seg["start"]

    for w in aligned_words[:first_run_count]:
        if w["start"] > 0 or w["end"] > 0:
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
        remaining_result = align_segment_recursive(
            sub_seg, audio_path, compute_device, align_models, depth + 1
        )
        return first_run_words + remaining_result

    return first_run_words


def transcribe(audio_path: str) -> list[dict]:
    """WhisperX 전사 + 다국어 wav2vec2 정렬."""
    import whisperx

    device = detect_device()

    logger.info(f"WhisperX: transcribing on {device}...")
    model = _get_whisper_model(device)
    result = model.transcribe(audio_path)
    segments = result.get("segments", [])
    logger.info(f"WhisperX: {len(segments)} segments transcribed")

    # 언어 감지
    langs = detect_languages(segments)
    logger.info(f"WhisperX: detected languages: {', '.join(langs)}")

    # 단일 언어: 전체 한번에 정렬
    if len(langs) <= 1:
        align_model, metadata = _get_align_model(langs[0], device)
        aligned = whisperx.align(segments, align_model, metadata, audio_path, device)
        words = extract_words(aligned["segments"])
        logger.info(f"WhisperX: {len(words)} words aligned (single language)")
        return words

    # 다국어: 캐시된 모델 사용 + 세그먼트별 재귀 정렬
    align_models = {}
    for lang in langs:
        align_models[lang] = _get_align_model(lang, device)

    all_words = []
    for seg in segments:
        if not seg.get("text", "").strip():
            continue
        seg_words = align_segment_recursive(seg, audio_path, device, align_models)
        all_words.extend(seg_words)

    all_words.sort(key=lambda w: w["start"])
    logger.info(f"WhisperX: {len(all_words)} words aligned (multilingual)")
    return all_words


# ──────────────────────────────────────────────
# 3. Text Alignment
# ──────────────────────────────────────────────

def normalize(text: str) -> str:
    """비교용 정규화: 공백/특수문자 제거, 소문자화."""
    return re.sub(r'[^\w]', '', text.lower())


def align_lyrics(whisper_words: list[dict], lyrics_lines: list[str]) -> list[tuple]:
    """워드 레벨 순차 매칭: 각 라인의 단어를 Whisper 워드에서 찾아 시작 시간 확정."""
    w_norms = [normalize(w["word"]) for w in whisper_words]
    results = []
    w_cursor = 0

    for line_idx, line in enumerate(lyrics_lines):
        line_words = line.split()
        if not line_words:
            results.append((None, line))
            continue

        remaining_lines = len(lyrics_lines) - line_idx
        remaining_words = len(whisper_words) - w_cursor
        max_search = min(remaining_words, max(15, remaining_words * 3 // max(remaining_lines, 1)))

        matched_idx = -1
        for lw in line_words:
            lw_norm = normalize(lw)
            if not lw_norm:
                continue
            best_idx, best_score = -1, 0.0
            for i in range(w_cursor, min(w_cursor + max_search, len(whisper_words))):
                if not w_norms[i]:
                    continue
                score = SequenceMatcher(None, lw_norm, w_norms[i], autojunk=False).ratio()
                if score > best_score:
                    best_score = score
                    best_idx = i
            if best_score >= 0.5 and best_idx >= 0:
                matched_idx = best_idx
                break

        if matched_idx >= 0:
            results.append((whisper_words[matched_idx]["start"], line))
            w_cursor = matched_idx + 1
        else:
            results.append((None, line))

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
) -> dict:
    """Main processing pipeline. Returns dict with result storage paths."""
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

        # Step 1: Vocal separation (Demucs Python API, cached model)
        await update_job_progress(job_id, 10, "Separating vocals and instrumentals...")
        vocals_path, mr_path = await asyncio.to_thread(
            separate_vocals, local_input, work_dir
        )
        await update_job_progress(job_id, 30, "Separation complete")

        # Encode + upload MP3s in parallel
        if job_type in ("mr", "lrc_mr"):
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

        # Step 2: Transcription + alignment (cached Whisper model)
        if job_type in ("lrc", "lrc_mr"):
            await update_job_progress(job_id, 40, "Recognizing speech...")
            words = await asyncio.to_thread(transcribe, vocals_path)
            await update_job_progress(job_id, 60, "Speech recognized")

            # Step 3: Lyrics alignment
            if lyrics:
                lyrics_lines = [l.strip() for l in lyrics.strip().splitlines() if l.strip()]
                await update_job_progress(job_id, 65, "Syncing lyrics to audio...")
                aligned = align_lyrics(words, lyrics_lines)
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
