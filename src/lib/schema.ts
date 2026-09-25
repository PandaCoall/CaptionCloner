import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "must be a 6-digit hex colour with a leading #");

export const CAPTION_FONTS = [
  "Montserrat",
  "Poppins",
  "Inter",
  "Anton",
  "Archivo",
  "Bebas Neue",
  "Oswald",
  "Bangers",
  "Barlow Condensed",
  "Lilita One",
  "Fjalla One",
] as const;

export function fontWeightFor(family: string): number {
  if (
    family === "Bebas Neue" ||
    family === "Anton" ||
    family === "Bangers" ||
    family === "Lilita One" ||
    family === "Fjalla One"
  ) {
    return 400;
  }
  if (family === "Oswald" || family === "Barlow Condensed") return 700;
  return 800;
}

export function fontTracking(family: string): string {
  if (family === "Bebas Neue") return "0.08em";
  if (family === "Oswald" || family === "Barlow Condensed" || family === "Fjalla One") return "0.06em";
  if (family === "Anton" || family === "Bangers" || family === "Lilita One") return "0.045em";
  return "0.04em";
}

export const captionStyleSchema = z
  .object({
    "font-family": z.string().min(1),
    "font-size": z.number(),
    italic: z.boolean(),
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
    "has-box": z.boolean(),
    "box-color": hexColor,
    "word-box-color": hexColor,
    "box-radius": z.number(),
    "box-pad-x": z.number(),
    "box-pad-y": z.number(),
    "box-gap": z.number(),
    animation: z.enum(["none", "pop", "punch"]),
  })
  .strict();

export type CaptionStyle = z.infer<typeof captionStyleSchema>;

export const extractModelSchema = captionStyleSchema
  .extend({
    caption: z.string().min(1),
    highlight: z.string().min(1),
    background: z.string().optional(),
  })
  .strict();

export type ExtractedCaption = z.infer<typeof extractModelSchema>;

export type StyleLook = {
  id: string;
  name: string;
  style: CaptionStyle;
  background: string;
  caption: string;
  highlight: string;
};

export function splitExtracted(payload: ExtractedCaption): {
  style: CaptionStyle;
  caption: string;
  highlight: string;
  background: string;
} {
  const { caption, highlight, background, ...style } = payload;
  return {
    style,
    caption,
    highlight,
    background:
      background && isCssLinearGradient(background) ? background.trim() : FALLBACK_GRADIENT,
  };
}

export const EXTRACTION_PROMPT = `You are reading a reference frame from a short-form video to clone the on-screen caption AND its styling. Return ONLY a JSON object — no prose, no markdown fences.
Keys:
- caption: exact on-screen caption. Use \\n between visually stacked lines (each bar or pill is its own line)
- highlight: the single word that is accented (different fill, plate colour, or both); if none, use the last word
- font-family: closest of Montserrat, Poppins, Inter, Anton, Archivo, Bebas Neue, Oswald, Bangers, Barlow Condensed, Lilita One, Fjalla One
- font-size: pixels on a 1080x1920 canvas
- italic: true if the type is slanted / oblique
- line-color: hex of the non-highlighted words
- word-color: hex of the highlighted word
- outline-color: hex stroke (use #000000 if none)
- outline-width: stroke pixels, 0 if the type sits on plates instead of an outline
- shadow-color: hex
- shadow-offset: pixels, 0 if none
- max-words-per-line: integer typical of a single stacked line
- position: always "custom-position"
- x: always 0
- y: pixels from canvas top to the TOP of the caption block (mid-frame is ~900, lower-third is ~1100–1400)
- has-box: true if words sit on coloured bars, pills, or plates; false if the type is only stroked / outlined
- box-color: hex fill of the non-highlight plates (use #000000 if has-box is false)
- word-box-color: hex fill of the highlighted plate. If the highlight is only a text-colour change on the same plate, set this equal to box-color
- box-radius: corner radius in pixels. 0 = sharp bars, 12–24 = rounded pills
- box-pad-x: horizontal padding inside each plate, pixels
- box-pad-y: vertical padding inside each plate, pixels
- box-gap: vertical gap between stacked plates, pixels
- background: a CSS linear-gradient(...) that matches the overall scene behind the caption
Every key except background must be present. Colours as 6-digit hex with a leading #. Do not add keys.`;

export const FALLBACK_GRADIENT =
  "linear-gradient(180deg, #111113 0%, #1c1c22 55%, #0a0a0b 100%)";

export const BOXED_GRADIENT =
  "linear-gradient(160deg, #16122e 0%, #3a1233 48%, #6b1528 100%)";

export const DEFAULT_STYLE: CaptionStyle = {
  "font-family": "Montserrat",
  "font-size": 78,
  italic: false,
  animation: "none",
  "line-color": "#FFFFFF",
  "word-color": "#F5E600",
  "outline-color": "#000000",
  "outline-width": 8,
  "shadow-color": "#000000",
  "shadow-offset": 3,
  "max-words-per-line": 2,
  position: "custom-position",
  x: 0,
  y: 920,
  "has-box": false,
  "box-color": "#000000",
  "word-box-color": "#E31C23",
  "box-radius": 0,
  "box-pad-x": 28,
  "box-pad-y": 14,
  "box-gap": 10,
};

export const BARS_STYLE: CaptionStyle = {
  "font-family": "Anton",
  "font-size": 72,
  italic: false,
  animation: "none",
  "line-color": "#FFFFFF",
  "word-color": "#FFFFFF",
  "outline-color": "#000000",
  "outline-width": 0,
  "shadow-color": "#000000",
  "shadow-offset": 0,
  "max-words-per-line": 2,
  position: "custom-position",
  x: 0,
  y: 960,
  "has-box": true,
  "box-color": "#000000",
  "word-box-color": "#E31C23",
  "box-radius": 0,
  "box-pad-x": 30,
  "box-pad-y": 14,
  "box-gap": 8,
};

export const PILLS_STYLE: CaptionStyle = {
  "font-family": "Montserrat",
  "font-size": 64,
  italic: false,
  animation: "none",
  "line-color": "#FFFFFF",
  "word-color": "#F5E600",
  "outline-color": "#000000",
  "outline-width": 0,
  "shadow-color": "#000000",
  "shadow-offset": 0,
  "max-words-per-line": 1,
  position: "custom-position",
  x: 0,
  y: 1000,
  "has-box": true,
  "box-color": "#2D4CFF",
  "word-box-color": "#2D4CFF",
  "box-radius": 16,
  "box-pad-x": 36,
  "box-pad-y": 16,
  "box-gap": 14,
};

export const GREEN_POP_STYLE: CaptionStyle = {
  "font-family": "Anton",
  "font-size": 84,
  italic: false,
  animation: "none",
  "line-color": "#FFFFFF",
  "word-color": "#00E31A",
  "outline-color": "#000000",
  "outline-width": 12,
  "shadow-color": "#000000",
  "shadow-offset": 0,
  "max-words-per-line": 2,
  position: "custom-position",
  x: 0,
  y: 1160,
  "has-box": false,
  "box-color": "#000000",
  "word-box-color": "#00E31A",
  "box-radius": 0,
  "box-pad-x": 28,
  "box-pad-y": 14,
  "box-gap": 10,
};

export const RED_WORD_STYLE: CaptionStyle = {
  "font-family": "Anton",
  "font-size": 88,
  italic: false,
  animation: "none",
  "line-color": "#FFFFFF",
  "word-color": "#FF1A1A",
  "outline-color": "#000000",
  "outline-width": 12,
  "shadow-color": "#000000",
  "shadow-offset": 0,
  "max-words-per-line": 3,
  position: "custom-position",
  x: 0,
  y: 1280,
  "has-box": false,
  "box-color": "#000000",
  "word-box-color": "#FF1A1A",
  "box-radius": 0,
  "box-pad-x": 28,
  "box-pad-y": 14,
  "box-gap": 10,
};

export const THICK_OUTLINE_STYLE: CaptionStyle = {
  "font-family": "Anton",
  "font-size": 76,
  italic: false,
  animation: "none",
  "line-color": "#FFFFFF",
  "word-color": "#FFFFFF",
  "outline-color": "#000000",
  "outline-width": 16,
  "shadow-color": "#000000",
  "shadow-offset": 0,
  "max-words-per-line": 2,
  position: "custom-position",
  x: 0,
  y: 1180,
  "has-box": false,
  "box-color": "#000000",
  "word-box-color": "#FFFFFF",
  "box-radius": 0,
  "box-pad-x": 28,
  "box-pad-y": 14,
  "box-gap": 10,
};

export const NEWS_CONDENSED_STYLE: CaptionStyle = {
  "font-family": "Bebas Neue",
  "font-size": 92,
  italic: false,
  animation: "none",
  "line-color": "#111111",
  "word-color": "#111111",
  "outline-color": "#F7F4EC",
  "outline-width": 5,
  "shadow-color": "#000000",
  "shadow-offset": 0,
  "max-words-per-line": 3,
  position: "custom-position",
  x: 0,
  y: 820,
  "has-box": false,
  "box-color": "#F7F4EC",
  "word-box-color": "#FFFFFF",
  "box-radius": 4,
  "box-pad-x": 10,
  "box-pad-y": 4,
  "box-gap": 8,
};

export const LIME_ITALIC_STYLE: CaptionStyle = {
  "font-family": "Oswald",
  "font-size": 82,
  italic: true,
  animation: "none",
  "line-color": "#D8FF1A",
  "word-color": "#E8FF3D",
  "outline-color": "#000000",
  "outline-width": 12,
  "shadow-color": "#000000",
  "shadow-offset": 0,
  "max-words-per-line": 3,
  position: "custom-position",
  x: 0,
  y: 1180,
  "has-box": false,
  "box-color": "#000000",
  "word-box-color": "#E8FF3D",
  "box-radius": 0,
  "box-pad-x": 28,
  "box-pad-y": 14,
  "box-gap": 10,
};

export const GOLD_ITALIC_STYLE: CaptionStyle = {
  "font-family": "Oswald",
  "font-size": 86,
  italic: true,
  animation: "none",
  "line-color": "#FFD000",
  "word-color": "#FFE14A",
  "outline-color": "#000000",
  "outline-width": 13,
  "shadow-color": "#000000",
  "shadow-offset": 0,
  "max-words-per-line": 3,
  position: "custom-position",
  x: 0,
  y: 1240,
  "has-box": false,
  "box-color": "#000000",
  "word-box-color": "#FFE14A",
  "box-radius": 0,
  "box-pad-x": 28,
  "box-pad-y": 14,
  "box-gap": 10,
};

export const YELLOW_PUNCH_STYLE: CaptionStyle = {
  "font-family": "Lilita One",
  "font-size": 96,
  italic: true,
  animation: "none",
  "line-color": "#F4FF00",
  "word-color": "#F4FF00",
  "outline-color": "#000000",
  "outline-width": 16,
  "shadow-color": "#000000",
  "shadow-offset": 0,
  "max-words-per-line": 2,
  position: "custom-position",
  x: 0,
  y: 980,
  "has-box": false,
  "box-color": "#000000",
  "word-box-color": "#F4FF00",
  "box-radius": 0,
  "box-pad-x": 28,
  "box-pad-y": 14,
  "box-gap": 10,
};

export const RED_OUTLINE_STYLE: CaptionStyle = {
  "font-family": "Fjalla One",
  "font-size": 78,
  italic: false,
  animation: "none",
  "line-color": "#FFFFFF",
  "word-color": "#FFFFFF",
  "outline-color": "#FF1F1F",
  "outline-width": 10,
  "shadow-color": "#000000",
  "shadow-offset": 0,
  "max-words-per-line": 3,
  position: "custom-position",
  x: 0,
  y: 1120,
  "has-box": false,
  "box-color": "#000000",
  "word-box-color": "#FFFFFF",
  "box-radius": 0,
  "box-pad-x": 28,
  "box-pad-y": 14,
  "box-gap": 10,
};

export const NEWS_BANNER_GRADIENT =
  "linear-gradient(115deg, #F4F0E6 0%, #F4F0E6 46%, #E31C23 46.2%, #E31C23 58%, #0B1C3D 58.2%)";

export const BUILT_IN_LOOKS: StyleLook[] = [
  {
    id: "outline",
    name: "Outline type",
    style: DEFAULT_STYLE,
    background: FALLBACK_GRADIENT,
    caption: "YOUR PRIVATE\nVIEWING TODAY",
    highlight: "VIEWING",
  },
  {
    id: "green-pop",
    name: "Green pop",
    style: GREEN_POP_STYLE,
    background: BOXED_GRADIENT,
    caption: "RHODE ISLAND\nJUVENILE",
    highlight: "JUVENILE",
  },
  {
    id: "red-word",
    name: "Red word",
    style: RED_WORD_STYLE,
    background: BOXED_GRADIENT,
    caption: "JUST TO SELL",
    highlight: "SELL",
  },
  {
    id: "thick-outline",
    name: "Thick outline",
    style: THICK_OUTLINE_STYLE,
    background: BOXED_GRADIENT,
    caption: "ALLEGEDLY BEING\nLINKED BACK",
    highlight: "LINKED",
  },
  {
    id: "news-condensed",
    name: "News condensed",
    style: NEWS_CONDENSED_STYLE,
    background: NEWS_BANNER_GRADIENT,
    caption: "FARM WORKER WITH\nPARKINSON'S?",
    highlight: "WITH",
  },
  {
    id: "lime-italic",
    name: "Lime italic",
    style: LIME_ITALIC_STYLE,
    background: BOXED_GRADIENT,
    caption: "A GYNECOLOGIST AT",
    highlight: "GYNECOLOGIST",
  },
  {
    id: "gold-italic",
    name: "Gold italic",
    style: GOLD_ITALIC_STYLE,
    background: BOXED_GRADIENT,
    caption: "AFTER LINKS TO",
    highlight: "LINKS",
  },
  {
    id: "yellow-punch",
    name: "Yellow punch",
    style: YELLOW_PUNCH_STYLE,
    background: "linear-gradient(180deg, #8ec8ea 0%, #d7eef8 55%, #f4f7f2 100%)",
    caption: "PODRÍAS",
    highlight: "PODRÍAS",
  },
  {
    id: "red-outline",
    name: "Red outline",
    style: RED_OUTLINE_STYLE,
    background: "linear-gradient(180deg, #3a342c 0%, #1c1916 100%)",
    caption: "YOU SERVE THIS",
    highlight: "SERVE",
  },
  {
    id: "bars",
    name: "Black / red bars",
    style: BARS_STYLE,
    background: BOXED_GRADIENT,
    caption: "STRUGGLE WITH\nANXIETY\nDEPRESSION",
    highlight: "DEPRESSION",
  },
  {
    id: "pills",
    name: "Blue pills",
    style: PILLS_STYLE,
    background: BOXED_GRADIENT,
    caption: "VICTIMS\nARE\nFINALLY",
    highlight: "ARE",
  },
];

export function normalizeStyle(style: Partial<CaptionStyle> | null | undefined): CaptionStyle {
  const animation = style?.animation === "pop" || style?.animation === "punch" ? style.animation : "none";
  return {
    ...DEFAULT_STYLE,
    ...style,
    animation,
    position: "custom-position",
    x: 0,
  };
}

const COLOR_KEYS = [
  "line-color",
  "word-color",
  "outline-color",
  "shadow-color",
  "box-color",
  "word-box-color",
] as const;

const NUMBER_KEYS = [
  "font-size",
  "outline-width",
  "shadow-offset",
  "max-words-per-line",
  "y",
  "box-radius",
  "box-pad-x",
  "box-pad-y",
  "box-gap",
] as const;

function normalizeHex(value: string): string {
  let v = value.trim();
  if (v.startsWith("0x")) v = `#${v.slice(2)}`;
  if (!v.startsWith("#")) v = `#${v}`;
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  if (/^#[0-9A-Fa-f]{8}$/.test(v)) v = v.slice(0, 7);
  return v.toUpperCase();
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/px$/i, "").trim());
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function toBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "yes", "1", "box", "boxed", "bar", "pill", "plate"].includes(v)) return true;
    if (["false", "no", "0", "none", "outline", "stroke"].includes(v)) return false;
  }
  return undefined;
}

function closestFont(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes("impact") || lower.includes("bebas") || lower.includes("compressed")) {
    return "Bebas Neue";
  }
  if (lower.includes("oswald") || lower.includes("grotesk")) return "Oswald";
  if (lower.includes("bangers") || lower.includes("comic")) return "Bangers";
  if (lower.includes("lilita")) return "Lilita One";
  if (lower.includes("fjalla")) return "Fjalla One";
  const hit = CAPTION_FONTS.find((font) => lower.includes(font.toLowerCase()));
  return hit ?? "Montserrat";
}

function normalizeY(value: number): number {
  if (value >= 0 && value <= 1) return Math.round(value * 1920);
  if (value > 1 && value <= 100) return Math.round((value / 100) * 1920);
  return Math.max(0, Math.min(1920, Math.round(value)));
}

export function coerceExtracted(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const src = raw as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  const caption = src.caption ?? src.text ?? src.Caption;
  if (typeof caption === "string" && caption.trim()) {
    next.caption = caption.replace(/\\n/g, "\n").trim();
  }

  const highlight = src.highlight ?? src.word ?? src.accent;
  if (typeof highlight === "string" && highlight.trim()) {
    next.highlight = highlight.trim().split(/\s+/)[0];
  } else if (typeof next.caption === "string") {
    const parts = next.caption.split(/\s+/).filter(Boolean);
    next.highlight = parts[parts.length - 1];
  }

  const family = src["font-family"] ?? src.fontFamily ?? src.font;
  next["font-family"] = closestFont(typeof family === "string" ? family : "Montserrat");

  for (const key of NUMBER_KEYS) {
    const n = toNumber(src[key] ?? src[key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())]);
    if (n !== undefined) next[key] = key === "max-words-per-line" ? Math.max(1, Math.round(n)) : n;
  }
  if (typeof next.y === "number") next.y = normalizeY(next.y);

  for (const key of COLOR_KEYS) {
    const value = src[key] ?? src[key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())];
    if (typeof value === "string") next[key] = normalizeHex(value);
  }

  const boxed = toBool(src["has-box"] ?? src.hasBox ?? src.boxed ?? src.box);
  next["has-box"] = boxed === true;
  const italic = toBool(src.italic ?? src.oblique ?? src.slanted);
  next.italic = italic === true;
  const motion = src.animation;
  next.animation = motion === "pop" || motion === "punch" ? motion : "none";

  if (typeof next["font-size"] !== "number") next["font-size"] = 72;
  if (typeof next["max-words-per-line"] !== "number") next["max-words-per-line"] = 2;
  if (typeof next.y !== "number") next.y = next["has-box"] ? 980 : 920;
  if (typeof next["line-color"] !== "string") next["line-color"] = "#FFFFFF";
  if (typeof next["word-color"] !== "string") next["word-color"] = next["line-color"];
  if (typeof next["outline-color"] !== "string") next["outline-color"] = "#000000";
  if (typeof next["shadow-color"] !== "string") next["shadow-color"] = "#000000";
  if (typeof next["box-color"] !== "string") next["box-color"] = "#000000";
  if (typeof next["word-box-color"] !== "string") next["word-box-color"] = next["box-color"];
  if (typeof next["box-radius"] !== "number") next["box-radius"] = 0;
  if (typeof next["box-pad-x"] !== "number") next["box-pad-x"] = 28;
  if (typeof next["box-pad-y"] !== "number") next["box-pad-y"] = 14;
  if (typeof next["box-gap"] !== "number") next["box-gap"] = 10;

  if (typeof next["outline-width"] !== "number") next["outline-width"] = next["has-box"] ? 0 : 6;
  if (typeof next["shadow-offset"] !== "number") next["shadow-offset"] = next["has-box"] ? 0 : 4;

  next.position = "custom-position";
  next.x = 0;

  const background = src.background;
  if (typeof background === "string" && isCssLinearGradient(background)) {
    next.background = background.trim();
  }

  return next;
}

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
