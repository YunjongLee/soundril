"""
Audio processing pipeline.
Ported from lrc-generator/generate.py + app.py.
"""

import re
import subprocess
import sys
import tempfile
from difflib import SequenceMatcher
from pathlib import Path

from .storage import download_file, upload_file, update_job_progress
from .logger import get_logger

logger = get_logger("pipeline")


def detect_device() -> str:
    import torch
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


# ──────────────────────────────────────────────
# 1. Vocal Separation (Demucs)
# ──────────────────────────────────────────────

def separate_vocals(audio_path: str, output_dir: str) -> tuple[str, str]:
    """
    Demucs htdemucs로 보컬/MR 분리.
    Returns: (vocals_wav_path, mr_wav_path)
    """
    logger.info("Demucs: separating vocals...")
    device = detect_device()

    cmd = [
        sys.executable, "-m", "demucs",
        "--two-stems", "vocals",
        "-n", "htdemucs",
        "-o", output_dir,
    ]
    if device == "cuda":
        cmd.extend(["-d", "cuda"])

    cmd.append(audio_path)

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Demucs failed: {result.stderr[:500]}")

    stem = Path(audio_path).stem
    demucs_dir = Path(output_dir) / "htdemucs" / stem
    vocals_path = demucs_dir / "vocals.wav"
    mr_path = demucs_dir / "no_vocals.wav"

    if not vocals_path.exists():
        raise RuntimeError(f"Vocals file not found: {vocals_path}")

    return str(vocals_path), str(mr_path)


def encode_mp3(wav_path: str, mp3_path: str, bitrate: str = "320k"):
    """WAV → MP3 encoding via ffmpeg."""
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", wav_path, "-b:a", bitrate, mp3_path],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg encoding failed: {result.stderr[:300]}")


# ──────────────────────────────────────────────
# 2. WhisperX (Whisper + wav2vec2 forced alignment)
# ──────────────────────────────────────────────

def transcribe(audio_path: str, language: str) -> list[dict]:
    """WhisperX: Whisper transcription + wav2vec2 forced alignment."""
    import whisperx

    device = detect_device()
    compute_device = device

    logger.info(f"WhisperX: transcribing on {compute_device}...")
    model = whisperx.load_model("large-v3", compute_device, compute_type="float16" if device == "cuda" else "float32")
    result = model.transcribe(audio_path, language=language)

    logger.info(f"WhisperX: aligning {len(result.get('segments', []))} segments...")
    align_model, metadata = whisperx.load_align_model(language_code=language, device=compute_device)
    result = whisperx.align(result["segments"], align_model, metadata, audio_path, compute_device)

    words = []
    for segment in result["segments"]:
        for w in segment.get("words", []):
            word = w.get("word", "").strip()
            if word:
                words.append({
                    "word": word,
                    "start": w.get("start", 0),
                    "end": w.get("end", 0),
                })

    logger.info(f"WhisperX: {len(words)} words aligned")
    return words


# ──────────────────────────────────────────────
# 3. Text Alignment
# ──────────────────────────────────────────────

def normalize(text: str) -> str:
    """비교용 정규화: 공백/특수문자 제거, 소문자화."""
    return re.sub(r'[^\w]', '', text.lower())


def align_lyrics(whisper_words: list[dict], lyrics_lines: list[str]) -> list[tuple]:
    """
    워드 레벨 순차 매칭: 각 라인의 첫 단어를 Whisper 워드에서 찾아 시작 시간 확정.
    """
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
    """Generate LRC string from aligned results."""
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
    language: str = "ko",
    lyrics: str | None = None,
) -> dict:
    """
    Main processing pipeline.
    Returns dict with result storage paths.
    """
    work_dir = tempfile.mkdtemp(prefix=f"soundril_{job_id}_")
    result = {}

    try:
        # Download input file
        input_filename = Path(input_storage_path).name
        local_input = str(Path(work_dir) / input_filename)
        logger.info(f"Downloading {input_storage_path}...")
        await download_file(input_storage_path, local_input)
        await update_job_progress(job_id, 5, "Downloaded input file")

        # Step 1: Demucs vocal separation (progress 10→30)
        await update_job_progress(job_id, 10, "Separating vocals (Demucs)...")
        vocals_path, mr_path = separate_vocals(local_input, work_dir)
        await update_job_progress(job_id, 30, "Vocal separation complete")

        # Upload MR if needed
        if job_type in ("mr", "lrc_mr"):
            mr_mp3_path = str(Path(work_dir) / "mr.mp3")
            encode_mp3(mr_path, mr_mp3_path)
            mr_storage_path = f"results/{user_id}/{job_id}/mr.mp3"
            await upload_file(mr_mp3_path, mr_storage_path)
            result["mrStoragePath"] = mr_storage_path
            await update_job_progress(job_id, 35, "MR track uploaded")

        # Step 2: WhisperX transcription + alignment (progress 35→60)
        if job_type in ("lrc", "lrc_mr"):
            await update_job_progress(job_id, 40, "Transcribing audio (WhisperX)...")
            words = transcribe(vocals_path, language)
            await update_job_progress(job_id, 60, f"Transcription complete ({len(words)} words)")

            # Step 3: Lyrics alignment (progress 60→80)
            if lyrics:
                lyrics_lines = [l.strip() for l in lyrics.strip().splitlines() if l.strip()]
                await update_job_progress(job_id, 65, "Aligning lyrics...")
                aligned = align_lyrics(words, lyrics_lines)
                await update_job_progress(job_id, 80, "Lyrics aligned")

                # Generate and upload LRC
                lrc_content = generate_lrc(aligned)
                lrc_path = str(Path(work_dir) / "output.lrc")
                with open(lrc_path, "w", encoding="utf-8") as f:
                    f.write(lrc_content)

                lrc_storage_path = f"results/{user_id}/{job_id}/output.lrc"
                await upload_file(lrc_path, lrc_storage_path)
                result["lrcStoragePath"] = lrc_storage_path
                await update_job_progress(job_id, 90, "LRC file uploaded")

        # Upload processing log
        log_storage_path = f"logs/{user_id}/{job_id}/process.log"
        log_path = str(Path(work_dir) / "process.log")
        with open(log_path, "w") as f:
            f.write(f"Job {job_id} completed successfully\n")
        await upload_file(log_path, log_storage_path)
        result["logStoragePath"] = log_storage_path

        return result

    finally:
        # Cleanup temp directory
        import shutil
        shutil.rmtree(work_dir, ignore_errors=True)
