# ── Stage 1: Base ──
FROM python:3.11-slim-bookworm AS base

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# ── Stage 2: Install dependencies ──
FROM base AS deps

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 3: Download models ──
FROM deps AS models

# Whisper large-v3-turbo (~1.5GB, 3-4x faster than large-v3)
RUN python -c "import whisperx; whisperx.load_model('large-v3-turbo', 'cpu', compute_type='float32')"

# wav2vec2 alignment models (주요 언어)
RUN python -c "import whisperx; whisperx.load_align_model('en', 'cpu')"
RUN python -c "import whisperx; whisperx.load_align_model('ko', 'cpu')"
RUN python -c "import whisperx; whisperx.load_align_model('ja', 'cpu')"
RUN python -c "import whisperx; whisperx.load_align_model('zh', 'cpu')"

# ── Stage 4: Production ──
FROM models AS production

WORKDIR /app
COPY src/ ./src/

ENV PORT=8080
EXPOSE 8080

CMD ["python", "-m", "uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8080"]
