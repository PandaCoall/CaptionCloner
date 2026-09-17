import { NextResponse } from "next/server";
import { callGrokVision } from "@/lib/xai";
import {
  BACKGROUND_PROMPT,
  EXTRACTION_PROMPT,
  FALLBACK_GRADIENT,
  extractModelSchema,
  formatZodErrors,
  isCssLinearGradient,
  parseModelJson,
  splitExtracted,
} from "@/lib/schema";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_RETRIES = 3;

function errorResponse(status: number, message: string, errors?: string[]) {
  return NextResponse.json(
    errors ? { error: message, errors } : { error: message },
    { status },
  );
}

export async function POST(request: Request) {
  if (!process.env.XAI_API_KEY) {
    return errorResponse(500, "XAI_API_KEY is not set on the server");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(400, "Request body must be multipart form-data");
  }

  const file = form.get("image") ?? form.get("file");
  if (!(file instanceof File)) {
    return errorResponse(400, "Missing image file in form field 'image'");
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return errorResponse(
      400,
      `Unsupported file type '${file.type || "unknown"}'. Use png, jpeg, or webp.`,
    );
  }

  if (file.size > MAX_BYTES) {
    return errorResponse(400, `Image is ${(file.size / 1024 / 1024).toFixed(1)}MB. Max is 5MB.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  let lastErrors: string[] = [];
  let styleUnknown: unknown = null;

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
      styleUnknown = parseModelJson(raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === MAX_RETRIES) {
        return errorResponse(502, `Vision model call failed: ${message}`);
      }
      lastErrors = [`Model reply was not valid JSON: ${message}`];
      continue;
    }

    const parsed = extractModelSchema.safeParse(styleUnknown);
    if (parsed.success) {
      const { style, caption, highlight } = splitExtracted(parsed.data);
      const background = await extractBackground(dataUrl);
      return NextResponse.json({ style, background, caption, highlight });
    }

    lastErrors = formatZodErrors(parsed.error);
  }

  return errorResponse(
    422,
    "Extracted style failed schema validation after 3 retries",
    lastErrors,
  );
}

async function extractBackground(dataUrl: string): Promise<string> {
  try {
    const raw = await callGrokVision({
      dataUrl,
      prompt: BACKGROUND_PROMPT,
      maxTokens: 200,
    });
    const candidate = raw
      .replace(/```(?:css)?/gi, "")
      .replace(/```/g, "")
      .replace(/^["'`]+|["'`]+$/g, "")
      .trim();
    if (isCssLinearGradient(candidate)) {
      return candidate;
    }
  } catch {
    // fall through to dark fallback
  }
  return FALLBACK_GRADIENT;
}
