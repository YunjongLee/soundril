# ── Stage 1: Base ──
FROM python:3.11-slim-bookworm AS base

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    rubberband-cli \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# ── Stage 2: Install dependencies ──
FROM base AS deps

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 3: Download models ──
FROM deps AS models

# BS-Roformer 1296 (vocals/instrumental separation, SDR 12.1/16.3)
RUN mkdir -p /app/models && \
    python -c "from audio_separator.separator import Separator; s = Separator(model_file_dir='/app/models'); s.load_model(model_filename='model_bs_roformer_ep_368_sdr_12.9628.ckpt')"

# Whisper large-v3
RUN python -c "import whisperx; whisperx.load_model('large-v3', 'cpu', compute_type='float32')"

# wav2vec2 alignment models (주요 언어)
RUN python -c "import whisperx; whisperx.load_align_model('en', 'cpu')"
RUN python -c "import whisperx; whisperx.load_align_model('ko', 'cpu')"
RUN python -c "import whisperx; whisperx.load_align_model('ja', 'cpu')"
RUN python -c "import whisperx; whisperx.load_align_model('zh', 'cpu')"

# ── Stage 4: Production ──
FROM models AS production

WORKDIR /app
COPY src/ ./src/

ENV AUDIO_SEPARATOR_MODEL_DIR=/app/models
ENV PORT=8080
EXPOSE 8080

CMD ["python", "-m", "uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8080"]
