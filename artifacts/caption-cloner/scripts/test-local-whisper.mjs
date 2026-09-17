/**
 * Path 1 smoke test: Whisper tiny.en in-process, no xAI key.
 * Transcribes the public JFK sample and prints word timestamps.
 */
import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;

const SAMPLE =
  "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav";

const started = Date.now();
console.log("[path1] loading Xenova/whisper-tiny.en …");

const asr = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
  dtype: "q8",
});

console.log(`[path1] model ready in ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log("[path1] transcribing JFK sample …");

const output = await asr(SAMPLE, {
  language: "english",
  task: "transcribe",
  return_timestamps: "word",
});

const words = Array.isArray(output.chunks)
  ? output.chunks.map((c) => ({
      text: String(c.text || "").trim(),
      start: Array.isArray(c.timestamp) ? c.timestamp[0] : 0,
      end: Array.isArray(c.timestamp) ? c.timestamp[1] : 0,
    }))
  : [];

console.log("[path1] text:", String(output.text || "").trim());
console.log("[path1] words:", words.length);
for (const w of words.slice(0, 24)) {
  console.log(`  ${Number(w.start).toFixed(2)}–${Number(w.end).toFixed(2)}  ${w.text}`);
}

if (!String(output.text || "").toLowerCase().includes("ask")) {
  console.error("[path1] FAIL: expected JFK line to contain 'ask'");
  process.exit(1);
}
if (words.length < 5) {
  console.error("[path1] FAIL: expected word timestamps");
  process.exit(1);
}

console.log(`[path1] PASS in ${((Date.now() - started) / 1000).toFixed(1)}s — no xAI used`);
