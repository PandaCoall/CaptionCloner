#!/usr/bin/env python3
"""Path 1 smoke test: local Whisper, no xAI API."""
from __future__ import annotations

import sys
import time
import urllib.request
from pathlib import Path

SAMPLE_URL = "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav"
CACHE = Path("/tmp/caption-cloner-path1")
CACHE.mkdir(parents=True, exist_ok=True)
SAMPLE = CACHE / "jfk.wav"

started = time.time()
print("[path1] local Whisper test — no XAI_API_KEY")

if not SAMPLE.exists():
    print("[path1] downloading JFK sample…")
    urllib.request.urlretrieve(SAMPLE_URL, SAMPLE)
print(f"[path1] sample: {SAMPLE} ({SAMPLE.stat().st_size} bytes)")

from faster_whisper import WhisperModel

print("[path1] loading faster-whisper tiny.en (cpu, int8)…")
model = WhisperModel("tiny.en", device="cpu", compute_type="int8")
print(f"[path1] model ready in {time.time() - started:.1f}s")

segments, info = model.transcribe(str(SAMPLE), word_timestamps=True, language="en")
words = []
text_parts = []
for seg in segments:
    text_parts.append(seg.text.strip())
    if seg.words:
        for w in seg.words:
            token = (w.word or "").strip()
            if token:
                words.append((token, w.start, w.end))

text = " ".join(text_parts).strip()
print("[path1] text:", text)
print("[path1] words:", len(words))
for token, start, end in words[:24]:
    print(f"  {start:5.2f}–{end:5.2f}  {token}")

ok = "ask" in text.lower() and len(words) >= 5
print(f"[path1] {'PASS' if ok else 'FAIL'} in {time.time() - started:.1f}s — xAI not used")
sys.exit(0 if ok else 1)
