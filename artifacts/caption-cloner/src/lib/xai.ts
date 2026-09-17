const XAI_URL = "https://api.x.ai/v1/chat/completions";
const MODEL = "grok-4.6";

export async function callGrokVision(params: {
  dataUrl: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const key = process.env.XAI_API_KEY;
  if (!key) {
    throw new Error("XAI_API_KEY is not set on the server");
  }

  const res = await fetch(XAI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: params.maxTokens ?? 1000,
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

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      body?.error?.message ||
      body?.error ||
      `xAI request failed with HTTP ${res.status}`;
    throw new Error(String(message));
  }

  const text = body?.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    throw new Error("xAI returned an empty reply");
  }

  return text.trim();
}
