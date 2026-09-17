import { createServerFn } from "@tanstack/react-start";

export type TimedWord = {
  text: string;
  start: number;
  end: number;
};

export const transcribeAudio = createServerFn({ method: "POST" })
  .validator((input: { audioBase64: string; mimeType: string; filename: string }) => input)
  .handler(async ({ data }) => {
    const key = process.env.XAI_API_KEY;
    if (!key) {
      return { ok: false as const, error: "AI is not available in this environment" };
    }

    const bytes = Buffer.from(data.audioBase64, "base64");
    if (bytes.byteLength > 12 * 1024 * 1024) {
      return { ok: false as const, error: "Audio is too large. Keep clips under a few minutes." };
    }

    const form = new FormData();
    form.append("format", "true");
    form.append("language", "en");
    form.append(
      "file",
      new Blob([bytes], { type: data.mimeType || "audio/wav" }),
      data.filename || "audio.wav",
    );

    const res = await fetch("https://api.x.ai/v1/stt", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string } | string;
      message?: string;
      text?: string;
      duration?: number;
      words?: { text?: string; start?: number; end?: number }[];
    } | null;

    if (!res.ok) {
      const message =
        (typeof body?.error === "object" ? body.error?.message : body?.error) ||
        body?.message ||
        `Grok STT failed with HTTP ${res.status}`;
      return { ok: false as const, error: String(message) };
    }

    const words: TimedWord[] = Array.isArray(body?.words)
      ? body.words
          .map((w) => ({
            text: String(w.text || "").trim(),
            start: Number(w.start) || 0,
            end: Number(w.end) || Number(w.start) || 0,
          }))
          .filter((w) => w.text)
      : [];

    if (words.length === 0 && body?.text?.trim()) {
      return {
        ok: true as const,
        text: body.text.trim(),
        words: [
          {
            text: body.text.trim(),
            start: 0,
            end: Number(body.duration) || 2,
          },
        ],
      };
    }

    if (words.length === 0) {
      return { ok: false as const, error: "No speech found in this clip." };
    }

    return {
      ok: true as const,
      text: String(body?.text || words.map((w) => w.text).join(" ")),
      words,
    };
  });
