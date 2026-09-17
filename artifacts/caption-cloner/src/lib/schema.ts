import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "must be a 6-digit hex colour with a leading #");

export const captionStyleSchema = z
  .object({
    "font-family": z.string().min(1),
    "font-size": z.number(),
    "line-color": hexColor,
    "word-color": hexColor,
    "outline-color": hexColor,
    "outline-width": z.number(),
    "shadow-color": hexColor,
    "shadow-offset": z.number(),
    "max-words-per-line": z.number().int(),
    position: z.literal("custom-position"),
    x: z.number().refine((n) => n === 0, { message: "must be 0" }),
    y: z.number().min(0).max(1920),
  })
  .strict();

export type CaptionStyle = z.infer<typeof captionStyleSchema>;

export const extractModelSchema = captionStyleSchema.extend({
  caption: z.string().min(1),
  highlight: z.string().min(1),
}).strict();

export type ExtractedCaption = z.infer<typeof extractModelSchema>;

export function splitExtracted(payload: ExtractedCaption): {
  style: CaptionStyle;
  caption: string;
  highlight: string;
} {
  const { caption, highlight, ...style } = payload;
  return { style, caption, highlight };
}

export const renderRequestSchema = z.object({
  style: captionStyleSchema,
  background: z.string().min(1),
  voiceText: z.string().optional(),
  audioUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  draft: z.boolean(),
});

export type RenderRequest = z.infer<typeof renderRequestSchema>;

export const EXTRACTION_PROMPT = `You are reading a reference frame from a short-form video to clone the on-screen caption AND its styling. Return ONLY a JSON object — no prose, no markdown fences.
Keys: caption (exact on-screen caption text, preserve line breaks as spaces), highlight (the single word that is accented / karaoke-highlighted; if none, use the last word), font-family (closest common web font: Montserrat, Poppins, Inter, Anton, Archivo), font-size (pixels on a 1080x1920 canvas), line-color (hex of the non-highlighted words), word-color (hex of the highlighted word), outline-color (hex stroke), outline-width (stroke pixels), shadow-color (hex), shadow-offset (pixels, 0 if none), max-words-per-line (integer), position (always "custom-position"), x (always 0), y (pixels from canvas top to the TOP of the caption block; text at the vertical midpoint is roughly 900).
Every key must be present. Colours as 6-digit hex with a leading #. If there is no accent colour, set word-color equal to line-color. Do not add keys.`;

export const BACKGROUND_PROMPT = `Look at this frame and return ONLY a CSS linear-gradient(...) value that matches the overall background. No prose, no markdown, no quotes. Example: linear-gradient(180deg, #111111 0%, #333333 100%)`;

export const FALLBACK_GRADIENT =
  "linear-gradient(180deg, #0b0b0f 0%, #16161f 55%, #1c1c28 100%)";

export const DEFAULT_STYLE: CaptionStyle = {
  "font-family": "Montserrat",
  "font-size": 72,
  "line-color": "#FFFFFF",
  "word-color": "#FFE566",
  "outline-color": "#000000",
  "outline-width": 6,
  "shadow-color": "#000000",
  "shadow-offset": 4,
  "max-words-per-line": 3,
  position: "custom-position",
  x: 0,
  y: 1400,
};

export function formatZodErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
}

export function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const payload = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(payload);
}

export function isCssLinearGradient(value: string): boolean {
  return /^\s*linear-gradient\s*\(/i.test(value.trim()) && value.includes(")");
}
