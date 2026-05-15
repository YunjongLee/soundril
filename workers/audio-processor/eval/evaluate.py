"""
Evaluate align_lyrics() against manually transcribed ground truth.

Usage:
    python -m eval.evaluate [--song geudae]

Loads cached whisper words + ground truth, calls align_lyrics, prints
per-line diff table + summary stats.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Make src.pipeline importable when run as a module from workers/audio-processor.
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.pipeline import align_lyrics  # noqa: E402


def load_song(name: str) -> tuple[dict, dict]:
    eval_dir = Path(__file__).resolve().parent
    fixture = json.loads((eval_dir / f"whisper_fixture_{name}.json").read_text())
    gt = json.loads((eval_dir / f"ground_truth_{name}.json").read_text())
    return fixture, gt


def evaluate(song: str = "geudae") -> None:
    fixture, gt = load_song(song)
    words = fixture["words"]
    segments = fixture.get("segments")
    lyrics_lines = [line["text"] for line in gt["lines"]]
    expected = [line["expected_sec"] for line in gt["lines"]]

    aligned = align_lyrics(words, lyrics_lines, segments=segments)

    diffs = []
    print()
    print(f"{'idx':>3}  {'algo':>8}  {'truth':>8}  {'diff':>8}  text")
    print("-" * 80)
    for i, ((algo_t, _), exp_t) in enumerate(zip(aligned, expected), start=1):
        diff = (algo_t or 0.0) - exp_t
        diffs.append(diff)
        status = "✓" if abs(diff) <= 0.5 else ("~" if abs(diff) <= 1.5 else "✗")
        algo_str = f"{algo_t:7.2f}s" if algo_t is not None else "  MISS  "
        print(f"{i:>3}  {algo_str}  {exp_t:7.2f}s  {diff:+7.2f}s {status}  {lyrics_lines[i-1]}")

    abs_diffs = [abs(d) for d in diffs]
    n = len(diffs)
    within_05 = sum(1 for d in abs_diffs if d <= 0.5)
    within_15 = sum(1 for d in abs_diffs if d <= 1.5)
    within_50 = sum(1 for d in abs_diffs if d <= 5.0)

    print("-" * 80)
    print(f"Lines              : {n}")
    print(f"Within ±0.5s (good): {within_05}/{n} ({within_05*100/n:.0f}%)")
    print(f"Within ±1.5s (ok)  : {within_15}/{n} ({within_15*100/n:.0f}%)")
    print(f"Within ±5.0s (loose): {within_50}/{n} ({within_50*100/n:.0f}%)")
    print(f"Mean abs error     : {sum(abs_diffs)/n:.2f}s")
    print(f"Median abs error   : {sorted(abs_diffs)[n//2]:.2f}s")
    print(f"Max abs error      : {max(abs_diffs):.2f}s")
    print()


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--song", default="geudae")
    args = p.parse_args()
    evaluate(args.song)
