import type { CSSProperties } from "react";
import type { CaptionStyle } from "./schema";
import type { TimedWord } from "./transcribe";

export type CaptionLine = {
  words: TimedWord[];
  start: number;
  end: number;
};

export function wrapWords(text: string, maxPerLine: number): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [[""]];
  const limit = Math.max(1, maxPerLine);

  if (normalized.includes("\n")) {
    return normalized
      .split("\n")
      .map((line) => line.trim().split(/\s+/).filter(Boolean))
      .filter((line) => line.length > 0);
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const lines: string[][] = [];
  for (let i = 0; i < words.length; i += limit) {
    lines.push(words.slice(i, i + limit));
  }
  return lines.length ? lines : [[""]];
}

function toLine(chunk: TimedWord[]): CaptionLine {
  return {
    words: chunk,
    start: chunk[0]?.start ?? 0,
    end: chunk[chunk.length - 1]?.end ?? 0,
  };
}

export function groupTimedLines(words: TimedWord[], maxPerLine: number): CaptionLine[] {
  const limit = Math.max(1, maxPerLine);
  const lines: CaptionLine[] = [];
  let chunk: TimedWord[] = [];
  for (const word of words) {
    const prev = chunk[chunk.length - 1];
    const pause = prev ? word.start - prev.end : 0;
    if (chunk.length >= limit || (chunk.length > 0 && pause > 0.55)) {
      lines.push(toLine(chunk));
      chunk = [];
    }
    chunk.push(word);
  }
  if (chunk.length) lines.push(toLine(chunk));
  return lines;
}

export function activeLineAt(lines: CaptionLine[], time: number): CaptionLine | null {
  if (!lines.length) return null;
  for (const line of lines) {
    if (time >= line.start && time <= line.end + 0.12) return line;
  }
  let best: CaptionLine | null = null;
  for (const line of lines) {
    if (line.start <= time) best = line;
  }
  return best;
}

export function boxMetrics(style: CaptionStyle, scale: number) {
  return {
    padX: Math.max(0, style["box-pad-x"] * scale),
    padY: Math.max(0, style["box-pad-y"] * scale),
    radius: Math.max(0, style["box-radius"] * scale),
    gap: Math.max(0, style["box-gap"] * scale),
  };
}

export function captionTextStyle(style: CaptionStyle, scale: number): CSSProperties {
  const boxed = style["has-box"];
  const stroke = boxed ? 0 : Math.max(0, style["outline-width"] * scale);
  const shadow = boxed ? 0 : Math.max(0, style["shadow-offset"] * scale);
  return {
    fontFamily: `"${style["font-family"]}", sans-serif`,
    fontSize: `${style["font-size"] * scale}px`,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: style["font-family"] === "Anton" ? "0.02em" : "-0.02em",
    textTransform: "uppercase" as const,
    WebkitTextStroke: stroke ? `${stroke}px ${style["outline-color"]}` : "0",
    paintOrder: "stroke fill",
    textShadow: shadow > 0 ? `${shadow}px ${shadow}px 0 ${style["shadow-color"]}` : "none",
    wordBreak: "normal",
    whiteSpace: "nowrap",
    textAlign: "center",
  };
}

export function plateStyle(
  style: CaptionStyle,
  scale: number,
  highlightLine: boolean,
): CSSProperties | undefined {
  if (!style["has-box"]) return undefined;
  const box = boxMetrics(style, scale);
  return {
    background: highlightLine ? style["word-box-color"] : style["box-color"],
    borderRadius: box.radius,
    padding: `${box.padY}px ${box.padX}px`,
  };
}

export function normalizeWord(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}
