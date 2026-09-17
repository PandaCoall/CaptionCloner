import { readFile } from "fs/promises";
import type { TimedWord } from "./ass";

export async function transcribeAudio(filePath: string): Promise<{
  text: string;
  words: TimedWord[];
}> {
  const key = process.env.XAI_API_KEY;
  if (!key) {
    throw new Error("XAI_API_KEY is not set on the server");
  }

  const bytes = await readFile(filePath);
  const form = new FormData();
  form.append("format", "true");
  form.append("file", new Blob([bytes], { type: "audio/mpeg" }), "audio.mp3");

  const res = await fetch("https://api.x.ai/v1/stt", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body?.error?.message || body?.error || body?.message || `Grok STT failed with HTTP ${res.status}`;
    throw new Error(String(message));
  }

  const words: TimedWord[] = Array.isArray(body?.words)
    ? body.words
        .map((w: { text?: string; start?: number; end?: number }) => ({
          text: String(w.text || "").trim(),
          start: Number(w.start) || 0,
          end: Number(w.end) || Number(w.start) || 0,
        }))
        .filter((w: TimedWord) => w.text)
    : [];

  if (words.length === 0 && typeof body?.text === "string" && body.text.trim()) {
    return {
      text: body.text.trim(),
      words: [{ text: body.text.trim(), start: 0, end: Number(body.duration) || 2 }],
    };
  }

  return { text: String(body?.text || words.map((w) => w.text).join(" ")), words };
}
