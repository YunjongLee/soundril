#!/usr/bin/env python3
"""
AI LRC Generator - Web UI
오디오 업로드 + 가사 붙여넣기 → MR + LRC 파일 생성
"""

import gradio as gr
import subprocess
import sys
import tempfile
import shutil
import logging
from datetime import datetime
from pathlib import Path

# ──────────────────────────────────────────────
# 로그 설정
# ──────────────────────────────────────────────

LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)


def get_logger(job_id: str) -> tuple:
    """작업별 로거 + 로그 파일 경로 반환."""
    log_path = LOG_DIR / f"{job_id}.log"
    logger = logging.getLogger(job_id)
    logger.setLevel(logging.DEBUG)
    handler = logging.FileHandler(log_path, encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(asctime)s %(message)s", datefmt="%H:%M:%S"))
    logger.addHandler(handler)
    return logger, log_path


# ──────────────────────────────────────────────
# 핵심 파이프라인
# ──────────────────────────────────────────────

def separate_vocals(audio_path: str, output_dir: str, save_dir: str, logger) -> tuple:
    """Demucs 보컬/MR 분리. (vocals_wav, mr_mp3, vocals_mp3) 반환."""
    logger.info("보컬 분리 시작 (Demucs)")
    result = subprocess.run(
        [sys.executable, "-m", "demucs", "--two-stems", "vocals", "-n", "htdemucs", "-o", output_dir, audio_path],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        logger.error(f"Demucs 에러: {result.stderr}")
        raise RuntimeError(f"Demucs 실패: {result.stderr[:200]}")

    stem = Path(audio_path).stem
    demucs_dir = Path(output_dir) / "htdemucs" / stem
    vocals_wav = demucs_dir / "vocals.wav"
    mr_wav = demucs_dir / "no_vocals.wav"

    save = Path(save_dir)
    save.mkdir(parents=True, exist_ok=True)

    vocals_mp3 = save / f"{stem}_vocals.mp3"
    mr_mp3 = save / f"{stem}_mr.mp3"

    subprocess.run(["ffmpeg", "-y", "-i", str(vocals_wav), "-b:a", "320k", str(vocals_mp3)], capture_output=True)
    subprocess.run(["ffmpeg", "-y", "-i", str(mr_wav), "-b:a", "320k", str(mr_mp3)], capture_output=True)

    logger.info(f"보컬 저장: {vocals_mp3}")
    logger.info(f"MR 저장: {mr_mp3}")

    return str(vocals_wav), str(mr_mp3), str(vocals_mp3)


def transcribe_whisperx(audio_path: str, language: str, logger) -> list:
    """WhisperX 전사 + wav2vec2 forced alignment."""
    import whisperx

    logger.info("WhisperX 전사 시작")
    model = whisperx.load_model("large-v3", "cpu", compute_type="float32")
    result = model.transcribe(audio_path, language=language)

    segments_text = [s["text"] for s in result.get("segments", [])]
    logger.info(f"인식된 세그먼트: {len(segments_text)}개")
    for i, text in enumerate(segments_text):
        logger.info(f"  세그먼트 {i+1}: {text}")

    logger.info("wav2vec2 강제 정렬 시작")
    align_model, metadata = whisperx.load_align_model(language_code=language, device="cpu")
    result = whisperx.align(result["segments"], align_model, metadata, audio_path, "cpu")

    words = []
    for segment in result["segments"]:
        for w in segment.get("words", []):
            word = w.get("word", "").strip()
            start = w.get("start", 0)
            end = w.get("end", 0)
            words.append({"word": word, "start": start, "end": end})
            logger.info(f"  [{start:6.2f}s ~ {end:6.2f}s] {word}")

    logger.info(f"정렬된 단어: {len(words)}개")
    return words


def align_lyrics(whisper_words: list, lyrics_lines: list, logger) -> list:
    """워드 레벨 순차 매칭."""
    import re
    from difflib import SequenceMatcher

    def normalize(text):
        return re.sub(r'[^\w]', '', text.lower())

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
            logger.info(f"  [{whisper_words[matched_idx]['start']:6.2f}s] {line}")
        else:
            results.append((None, line))
            logger.info(f"  [  ?.??s] {line} (매칭 실패)")

    # 보간
    for i in range(len(results)):
        if results[i][0] is not None:
            continue
        prev_t = next((results[j][0] for j in range(i-1, -1, -1) if results[j][0] is not None), 0.0)
        next_info = next(((j, results[j][0]) for j in range(i+1, len(results)) if results[j][0] is not None), None)
        if next_info:
            next_j, next_t = next_info
            gap = next_j - i
            for k, j in enumerate(range(i, next_j)):
                if results[j][0] is None:
                    results[j] = (prev_t + (next_t - prev_t) * (k+1) / (gap+1), results[j][1])
        else:
            results[i] = (prev_t + 2.0, results[i][1])

    return results


def generate_lrc(aligned: list) -> str:
    """LRC 문자열 생성."""
    lines = []
    for start, text in aligned:
        minutes = int(start // 60)
        secs = start % 60
        lines.append(f"[{minutes:02d}:{secs:05.2f}]{text}")
    return "\n".join(lines)


# ──────────────────────────────────────────────
# 메인 처리 함수
# ──────────────────────────────────────────────

def process(audio_file, lyrics_text, language):
    """전체 파이프라인 실행."""
    if audio_file is None:
        raise gr.Error("오디오 파일을 업로드해주세요.")
    if not lyrics_text or not lyrics_text.strip():
        raise gr.Error("가사를 입력해주세요.")

    # 작업 ID 생성
    job_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    logger, log_path = get_logger(job_id)
    logger.info(f"작업 시작: {Path(audio_file).name}")

    # 가사 파싱
    lyrics_lines = [l.strip() for l in lyrics_text.strip().splitlines() if l.strip()]
    logger.info(f"가사: {len(lyrics_lines)}줄")

    # 임시 디렉토리
    work_dir = tempfile.mkdtemp(prefix="lrc_")
    output_dir = Path(work_dir) / "output"
    output_dir.mkdir()

    try:
        # Step 1: 보컬 분리
        yield "Step 1/3: 보컬 분리 중...", None, None, None
        vocals_wav, mr_mp3, vocals_mp3 = separate_vocals(audio_file, work_dir, str(output_dir), logger)

        # Step 2: WhisperX
        yield "Step 2/3: WhisperX 인식 중...", None, None, None
        words = transcribe_whisperx(vocals_wav, language, logger)

        # Step 3: 정렬
        yield "Step 3/3: 가사 정렬 중...", None, None, None
        logger.info("가사 정렬 시작")
        aligned = align_lyrics(words, lyrics_lines, logger)

        # LRC 저장
        lrc_content = generate_lrc(aligned)
        stem = Path(audio_file).stem
        lrc_path = output_dir / f"{stem}.lrc"
        lrc_path.write_text(lrc_content, encoding="utf-8")
        logger.info(f"LRC 저장: {lrc_path}")

        # 로그 파일 복사
        log_copy = output_dir / f"{stem}.log"
        shutil.copy2(log_path, log_copy)

        logger.info("작업 완료")

        yield (
            f"완료! ({len(lyrics_lines)}줄, {len(words)}개 단어 인식)",
            str(mr_mp3),
            str(lrc_path),
            lrc_content,
        )

    except Exception as e:
        logger.error(f"에러: {e}")
        raise gr.Error(f"처리 실패: {e}")


# ──────────────────────────────────────────────
# Gradio UI
# ──────────────────────────────────────────────

with gr.Blocks(title="AI LRC Generator", theme=gr.themes.Soft()) as app:
    gr.Markdown("# AI LRC Generator\n오디오 + 가사 → MR + LRC 파일")

    with gr.Row():
        with gr.Column(scale=1):
            audio_input = gr.Audio(label="오디오 파일", type="filepath")
            lyrics_input = gr.Textbox(
                label="가사 (줄바꿈으로 구분)",
                placeholder="가사를 붙여넣으세요...",
                lines=15,
            )
            language_input = gr.Dropdown(
                choices=["ko", "en", "ja", "zh"],
                value="ko",
                label="언어",
            )
            run_btn = gr.Button("생성", variant="primary", size="lg")

        with gr.Column(scale=1):
            status_output = gr.Textbox(label="상태", interactive=False)
            mr_output = gr.File(label="MR 파일")
            lrc_output = gr.File(label="LRC 파일")
            lrc_preview = gr.Textbox(label="LRC 미리보기", lines=15, interactive=False)

    run_btn.click(
        fn=process,
        inputs=[audio_input, lyrics_input, language_input],
        outputs=[status_output, mr_output, lrc_output, lrc_preview],
    )

if __name__ == "__main__":
    app.launch(server_port=3100)
