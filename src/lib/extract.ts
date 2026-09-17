import { createServerFn } from "@tanstack/react-start";
import {
  EXTRACTION_PROMPT,
  coerceExtracted,
  extractModelSchema,
  formatZodErrors,
  parseModelJson,
  splitExtracted,
} from "./schema";

const MODEL = "grok-4.5";
const MAX_RETRIES = 1;

async function callGrokVision(params: { dataUrl: string; prompt: string }): Promise<string> {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("AI is not available in this environment");

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 900,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: params.dataUrl, detail: "high" },
            },
            { type: "text", text: params.prompt },
          ],
        },
      ],
    }),
  });

  const body = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  } | null;

  if (!res.ok) {
    throw new Error(String(body?.error?.message || `xAI vision failed with HTTP ${res.status}`));
  }

  const text = body?.choices?.[0]?.message?.content;
  if (!text) throw new Error("xAI returned an empty reply");
  return text.trim();
}

export const extractStyle = createServerFn({ method: "POST" })
  .validator((input: { imageBase64: string; mediaType: string }) => input)
  .handler(async ({ data }) => {
    if (!process.env.XAI_API_KEY) {
      return { ok: false as const, error: "AI is not available in this environment" };
    }

    const mediaType = data.mediaType || "image/jpeg";
    if (!["image/png", "image/jpeg", "image/webp"].includes(mediaType)) {
      return { ok: false as const, error: `Unsupported image type ${mediaType}` };
    }

    const dataUrl = `data:${mediaType};base64,${data.imageBase64}`;
    let lastErrors: string[] = [];
    let parsedUnknown: unknown = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const correction =
        attempt === 0
          ? ""
          : `\n\nYour previous JSON failed validation. Fix these errors and return ONLY the corrected JSON object:\n- ${lastErrors.join("\n- ")}`;

      try {
        const raw = await callGrokVision({
          dataUrl,
          prompt: EXTRACTION_PROMPT + correction,
        });
        parsedUnknown = coerceExtracted(parseModelJson(raw));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (attempt === MAX_RETRIES) {
          return { ok: false as const, error: `Vision model call failed: ${message}` };
        }
        lastErrors = [`Model reply was not valid JSON: ${message}`];
        continue;
      }

      const parsed = extractModelSchema.safeParse(parsedUnknown);
      if (parsed.success) {
        const { style, caption, highlight, background } = splitExtracted(parsed.data);
        return { ok: true as const, style, background, caption, highlight };
      }
      lastErrors = formatZodErrors(parsed.error);
    }

    return {
      ok: false as const,
      error: "Extracted style failed schema validation after a retry",
      errors: lastErrors,
    };
  });
