import type { CaptionStyle } from "./schema";

export type TimedWord = {
  text: string;
  start: number;
  end: number;
};

function hexToAss(hex: string): string {
  const clean = hex.replace("#", "").padStart(6, "0").slice(0, 6);
  const r = clean.slice(0, 2);
  const g = clean.slice(2, 4);
  const b = clean.slice(4, 6);
  return `&H00${b}${g}${r}`.toUpperCase();
}

function assTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const cs = Math.min(99, Math.round((clamped - Math.floor(clamped)) * 100));
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function escapeAss(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

function chunkWords(words: TimedWord[], maxPerLine: number): TimedWord[][] {
  const limit = Math.max(1, maxPerLine);
  const lines: TimedWord[][] = [];
  for (let i = 0; i < words.length; i += limit) {
    lines.push(words.slice(i, i + limit));
  }
  return lines;
}

export function buildAss(style: CaptionStyle, words: TimedWord[]): string {
  const font = style["font-family"] || "Montserrat";
  const size = Math.round(style["font-size"]);
  const outline = Math.max(0, Math.round(style["outline-width"]));
  const shadow = Math.max(0, Math.round(style["shadow-offset"]));
  const marginV = Math.max(0, Math.min(1920, Math.round(style.y)));

  const header = `[Script Info]
Title: Caption Cloner
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${font},${size},${hexToAss(style["word-color"])},${hexToAss(style["line-color"])},${hexToAss(style["outline-color"])},${hexToAss(style["shadow-color"])},-1,0,0,0,100,100,0,0,1,${outline},${shadow},8,40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = chunkWords(words, style["max-words-per-line"]).map((line) => {
    const start = line[0]?.start ?? 0;
    const end = line[line.length - 1]?.end ?? start + 0.4;
    const text = line
      .map((word) => {
        const dur = Math.max(1, Math.round((Math.max(word.end, word.start) - word.start) * 100));
        return `{\\k${dur}}${escapeAss(word.text)}`;
      })
      .join(" ");
    return `Dialogue: 0,${assTime(start)},${assTime(Math.max(end, start + 0.2))},Default,,0,0,0,,${text}`;
  });

  return header + events.join("\n") + "\n";
}
