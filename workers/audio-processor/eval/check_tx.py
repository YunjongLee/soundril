"""
전사 품질 스팟체크 — chunk_size 등 전사 설정 변경 시 회귀 확인용.

분리 + 전사만 수행하고 세그먼트 목록을 출력한다. 가사/매칭은 안 함.
긴 세그먼트(>18s)에 단어가 거의 없으면 under-transcription 의심.

사용:
  .venv/bin/python -u eval/check_tx.py "/path/to/song.mp3" [ko|en|...]
"""
from __future__ import annotations

import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.pipeline import normalize_audio, separate_vocals, transcribe  # noqa: E402


def main():
    audio = sys.argv[1]
    hint = sys.argv[2] if len(sys.argv) > 2 else "ko"
    work = tempfile.mkdtemp(prefix="soundril_txcheck_")
    print(f"=== {Path(audio).name} (hint={hint}) ===", flush=True)

    t0 = time.time()
    vocals, _mr = separate_vocals(audio, work)
    norm = str(Path(work) / "norm.wav")
    normalize_audio(vocals, norm)
    print(f"분리+normalize {time.time() - t0:.0f}s", flush=True)

    t1 = time.time()
    words, segs = transcribe(norm, language_hint=hint)
    print(f"\n전사 {time.time() - t1:.0f}s — {len(segs)} segments, {len(words)} words", flush=True)

    # 세그먼트별 단어 수 (단어 start 가 구간 안에 들어가는지로 카운트)
    for i, s in enumerate(segs):
        dur = s["end"] - s["start"]
        wc = sum(1 for w in words if s["start"] <= w["start"] < s["end"])
        flag = "  ⚠ under?" if dur > 18 and wc < dur / 3 else ""
        print(f"  seg[{i:2d}] [{s['start']:6.1f}~{s['end']:6.1f}] ({dur:4.1f}s, {wc:2d}w){flag}  {s['text'][:75]}")


if __name__ == "__main__":
    main()
