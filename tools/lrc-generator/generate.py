#!/usr/bin/env python3
"""
AI LRC Generator
오디오 + 평문 가사 → 타임스탬프 LRC 파일

Pipeline:
1. Demucs   - 보컬 분리 (배경음악 제거)
2. WhisperX - 음성 인식 + wav2vec2 forced alignment (워드 레벨 타임스탬프)
3. 텍스트 정렬 - 제공된 가사와 인식 결과 매칭
4. LRC 출력
"""

import argparse
import os
import subprocess
import sys
import tempfile
import time as _time
import warnings
from pathlib import Path

# 불필요한 경고 숨기기
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)
import logging
logging.getLogger("pyannote").setLevel(logging.ERROR)
logging.getLogger("whisperx").setLevel(logging.ERROR)
logging.getLogger("lightning").setLevel(logging.ERROR)
logging.getLogger("lightning_fabric").setLevel(logging.ERROR)


# ──────────────────────────────────────────────
# 1. Vocal Separation (Demucs)
# ──────────────────────────────────────────────

def separate_vocals(audio_path: str, output_dir: str, save_dir: str | None = None) -> str:
    """Demucs로 보컬/MR 트랙 분리."""
    print("  Demucs 실행 중...")
    result = subprocess.run(
        [
            sys.executable, "-m", "demucs",
            "--two-stems", "vocals",
            "-n", "htdemucs",
            "-o", output_dir,
            audio_path,
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"  Demucs 에러: {result.stderr}")
        sys.exit(1)

    stem = Path(audio_path).stem
    demucs_dir = Path(output_dir) / "htdemucs" / stem
    vocals_path = demucs_dir / "vocals.wav"
    mr_path = demucs_dir / "no_vocals.wav"

    if not vocals_path.exists():
        print(f"  보컬 파일을 찾을 수 없습니다: {vocals_path}")
        sys.exit(1)

    if save_dir:
        save = Path(save_dir)
        save.mkdir(parents=True, exist_ok=True)

        saved_vocals = save / f"{stem}_vocals.mp3"
        saved_mr = save / f"{stem}_mr.mp3"

        subprocess.run(
            ["ffmpeg", "-y", "-i", str(vocals_path), "-b:a", "320k", str(saved_vocals)],
            capture_output=True,
        )
        print(f"  보컬 저장: {saved_vocals}")

        if mr_path.exists():
            subprocess.run(
                ["ffmpeg", "-y", "-i", str(mr_path), "-b:a", "320k", str(saved_mr)],
                capture_output=True,
            )
            print(f"  MR 저장:   {saved_mr}")

    return str(vocals_path)


# ──────────────────────────────────────────────
# 2. WhisperX (Whisper + wav2vec2 forced alignment)
# ──────────────────────────────────────────────

def transcribe(audio_path: str, language: str, device: str) -> tuple[list, str]:
    """WhisperX 전사 + wav2vec2 forced alignment."""
    import whisperx

    compute_device = "cpu" if device == "mps" else device

    # Whisper 전사
    t0 = _time.time()
    print("  WhisperX 전사 중...")
    model = whisperx.load_model("large-v3", compute_device, compute_type="float32")
    if language == "auto":
        result = model.transcribe(audio_path)
    else:
        result = model.transcribe(audio_path, language=language)
    segments = result.get("segments", [])
    detected_lang = result.get("language", language if language != "auto" else "ko")
    print(f"  전사 완료 ({_time.time() - t0:.1f}초, {len(segments)}개 세그먼트, 언어: {detected_lang})")

    # wav2vec2 forced alignment
    t0 = _time.time()
    align_lang = language if language != "auto" else detected_lang
    align_model, metadata = whisperx.load_align_model(language_code=align_lang, device=compute_device)
    aligned = whisperx.align(segments, align_model, metadata, audio_path, compute_device)

    words = []
    for seg in aligned["segments"]:
        for w in seg.get("words", []):
            word = w.get("word", "").strip()
            if word:
                words.append({
                    "word": word,
                    "start": w.get("start", 0),
                    "end": w.get("end", 0),
                })

    print(f"  정렬 완료 ({_time.time() - t0:.1f}초, {len(words)}개 단어)")
    return words, align_lang


# ──────────────────────────────────────────────
# 3. Text Alignment
# ──────────────────────────────────────────────

def normalize(text: str) -> str:
    """비교용 정규화: 공백/특수문자 제거, 소문자화."""
    import re
    return re.sub(r'[^\w]', '', text.lower())


def align_lyrics(whisper_words: list, lyrics_lines: list) -> list:
    """워드 레벨 순차 매칭: 각 라인의 단어를 Whisper 워드에서 찾아 시작 시간 확정."""
    from difflib import SequenceMatcher

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


# ──────────────────────────────────────────────
# 4. LRC Output
# ──────────────────────────────────────────────

def format_lrc_time(seconds: float) -> str:
    minutes = int(seconds // 60)
    secs = seconds % 60
    return f"[{minutes:02d}:{secs:05.2f}]"


def generate_lrc(aligned: list) -> str:
    """LRC 문자열 생성."""
    lines = []
    for start, text in aligned:
        lines.append(f"{format_lrc_time(start)}{text}")
    return "\n".join(lines)


def write_lrc(aligned: list, output_path: str):
    with open(output_path, 'w', encoding='utf-8') as f:
        for start, text in aligned:
            f.write(f"{format_lrc_time(start)}{text}\n")


def print_preview(aligned: list):
    print("\n─── LRC Preview ───")
    for start, text in aligned:
        print(f"  {format_lrc_time(start)} {text}")
    print("────────────────────\n")


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────

def detect_device() -> str:
    import torch
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def main():
    parser = argparse.ArgumentParser(
        description="AI LRC Generator - 오디오 + 가사 → LRC",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
사용 예:
  python generate.py song.mp3 lyrics.txt
  python generate.py song.mp3 lyrics.txt -o output.lrc
  python generate.py song.mp3 lyrics.txt --no-separate
  python generate.py song.mp3 --separate-only --save-stems ./output
        """,
    )
    parser.add_argument("audio", help="오디오 파일 경로 (mp3, wav, flac 등)")
    parser.add_argument("lyrics", nargs="?", help="가사 텍스트 파일 경로 (줄바꿈으로 구분)")
    parser.add_argument("--separate-only", action="store_true",
                        help="보컬/MR 분리만 수행 (가사 파일 불필요)")
    parser.add_argument("-o", "--output", help="출력 LRC 파일 경로 (기본: 오디오파일명.lrc)")
    parser.add_argument("-l", "--language", default="auto", help="언어 코드 (기본: auto, 자동 감지)")
    parser.add_argument("--no-separate", action="store_true",
                        help="보컬 분리 단계 생략")
    parser.add_argument("--keep-vocals", action="store_true",
                        help="분리된 보컬 파일 보존")
    parser.add_argument("--save-stems", metavar="DIR",
                        help="보컬/MR 파일을 지정 디렉토리에 저장")
    parser.add_argument("--device", choices=["mps", "cuda", "cpu"],
                        help="디바이스 지정 (기본: 자동 감지)")
    args = parser.parse_args()

    audio_path = Path(args.audio).resolve()

    if not audio_path.exists():
        print(f"오류: 오디오 파일 없음 - {audio_path}")
        sys.exit(1)

    # --separate-only 모드
    if args.separate_only:
        save_dir = args.save_stems or "."
        temp_dir = tempfile.mkdtemp(prefix="lrc_")
        print("보컬/MR 분리 중...")
        separate_vocals(str(audio_path), temp_dir, save_dir)
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
        print("완료!")
        return

    # 가사 파일 필수 체크
    if not args.lyrics:
        print("오류: 가사 파일이 필요합니다")
        sys.exit(1)

    lyrics_path = Path(args.lyrics).resolve()
    if not lyrics_path.exists():
        print(f"오류: 가사 파일 없음 - {lyrics_path}")
        sys.exit(1)

    lyrics_lines = [
        line.strip()
        for line in lyrics_path.read_text(encoding='utf-8').splitlines()
        if line.strip()
    ]
    print(f"가사: {len(lyrics_lines)}줄 로드")

    # LRC 출력 경로
    if args.output:
        output_path = args.output
    elif args.save_stems:
        save = Path(args.save_stems)
        save.mkdir(parents=True, exist_ok=True)
        output_path = str(save / f"{audio_path.stem}.lrc")
    else:
        output_path = str(audio_path.with_suffix('.lrc'))

    total_start = _time.time()
    device = args.device or detect_device()
    print(f"디바이스: {device}")

    # Step 1: 보컬 분리
    temp_dir = None
    if args.no_separate:
        vocals_path = str(audio_path)
        print("Step 1/3: 보컬 분리 생략")
    else:
        t0 = _time.time()
        temp_dir = tempfile.mkdtemp(prefix="lrc_")
        print("Step 1/3: 보컬 분리 중...")
        vocals_path = separate_vocals(str(audio_path), temp_dir, args.save_stems)
        print(f"  완료 ({_time.time() - t0:.1f}초)")

    # Step 2: WhisperX 인식
    t0 = _time.time()
    print("Step 2/3: WhisperX 인식 중...")
    words, detected_primary = transcribe(vocals_path, args.language, device)
    print(f"  총 {len(words)}개 단어 ({_time.time() - t0:.1f}초)")

    # Step 3: 가사 정렬
    t0 = _time.time()
    print("Step 3/3: 가사 정렬 중...")
    aligned = align_lyrics(words, lyrics_lines)
    print(f"  완료 ({_time.time() - t0:.1f}초)")

    print_preview(aligned)
    write_lrc(aligned, output_path)
    print(f"LRC 저장: {output_path}")
    print(f"총 소요시간: {_time.time() - total_start:.1f}초")

    # 정리
    if temp_dir and not args.keep_vocals:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)

    print("완료!")


if __name__ == "__main__":
    main()
