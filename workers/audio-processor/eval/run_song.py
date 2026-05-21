"""
단일 곡 반복 테스트 하니스 — 전체 파이프라인(분리·전사·매칭)을 단계별 캐시로 실행.

  separate  → eval/_kkotgil/*_(Vocals)*.wav   (캐시, --resep로 강제)
  normalize → eval/_kkotgil/vocals_norm.wav   (캐시)
  transcribe→ eval/_kkotgil/fixture.json      (캐시, --retx로 강제)
  align     → MATCH/MISS 요약 + LRC

사용:
  .venv/bin/python -u eval/run_song.py          # 캐시 사용, 매칭만 다시
  .venv/bin/python -u eval/run_song.py --retx   # 전사부터 다시 (전사 코드 수정 후)
  .venv/bin/python -u eval/run_song.py --resep  # 분리부터 다시
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.pipeline import (  # noqa: E402
    _detect_primary_language,
    align_lyrics,
    generate_lrc,
    normalize_audio,
    separate_vocals,
    transcribe,
)

AUDIO = "/Users/iyunjong/Downloads/bugs_20260518172956/꽃길만 걷게 해줄게_데이브레이크.mp3"
CACHE = ROOT / "eval" / "_kkotgil"
LYRICS = CACHE / "lyrics.txt"


def stage_separate(resep: bool) -> Path:
    norm = CACHE / "vocals_norm.wav"
    if norm.exists() and not resep:
        print(f"[1/3 separate]  캐시 사용 → {norm.name}", flush=True)
        return norm
    print("[1/3 separate]  BS-Roformer 보컬 분리 중...", flush=True)
    t0 = time.time()
    vocals_path, _mr = separate_vocals(AUDIO, str(CACHE))
    print(f"                분리 완료 ({time.time() - t0:.0f}s)", flush=True)
    normalize_audio(vocals_path, str(norm))
    print(f"                normalize 완료 → {norm.name}", flush=True)
    return norm


def stage_transcribe(norm: Path, retx: bool):
    fixture = CACHE / "fixture.json"
    if fixture.exists() and not retx:
        print(f"[2/3 transcribe] 캐시 사용 → {fixture.name}", flush=True)
        d = json.loads(fixture.read_text())
        return d["words"], d["segments"]
    print("[2/3 transcribe] WhisperX 전사 중... (수 분 소요)", flush=True)
    t0 = time.time()
    words, segments = transcribe(str(norm), language_hint="ko")
    dt = time.time() - t0
    fixture.write_text(
        json.dumps(
            {
                "song": "꽃길만 걷게 해줄게 - 데이브레이크",
                "_note": f"run_song.py transcribe, {dt:.0f}s",
                "segments": segments,
                "words": words,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"                전사 완료 ({dt:.0f}s, {len(words)} words) → {fixture.name}", flush=True)
    return words, segments


class _Collector(logging.Handler):
    """align_lyrics 가 찍는 MATCH/MISS 로그를 집계."""

    def __init__(self):
        super().__init__()
        self.match = 0
        self.miss = 0
        self.miss_lines: list[str] = []

    def emit(self, record):
        m = record.getMessage().strip()
        if m.startswith("MATCH"):
            self.match += 1
        elif m.startswith("MISS"):
            self.miss += 1
            self.miss_lines.append(m)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--resep", action="store_true", help="분리부터 다시")
    ap.add_argument("--retx", action="store_true", help="전사부터 다시")
    args = ap.parse_args()

    CACHE.mkdir(parents=True, exist_ok=True)
    lyrics_lines = [
        l.strip() for l in LYRICS.read_text(encoding="utf-8").strip().splitlines() if l.strip()
    ]
    hint = _detect_primary_language("\n".join(lyrics_lines))
    print(f"=== 꽃길만 걷게 해줄게 — 가사 {len(lyrics_lines)}줄 (language_hint={hint}) ===", flush=True)

    norm = stage_separate(args.resep)
    words, segments = stage_transcribe(norm, args.retx or args.resep)

    col = _Collector()
    logging.getLogger("soundril.pipeline").addHandler(col)
    aligned = align_lyrics(words, lyrics_lines, segments=segments)
    logging.getLogger("soundril.pipeline").removeHandler(col)

    print()
    print(f"{'idx':>3}  {'time':>9}  text")
    print("-" * 64)
    for i, (t, text) in enumerate(aligned, start=1):
        print(f"{i:>3}  {t:8.2f}s  {text}")
    print("-" * 64)
    total = col.match + col.miss
    print(f"[3/3 align]  MATCH {col.match}/{total}   MISS {col.miss}/{total}")
    if col.miss_lines:
        print("MISS 라인:")
        for m in col.miss_lines:
            print(f"  - {m}")

    lrc = generate_lrc(aligned)
    (CACHE / "output.lrc").write_text(lrc, encoding="utf-8")
    print(f"\nLRC → {CACHE / 'output.lrc'}")


if __name__ == "__main__":
    main()
