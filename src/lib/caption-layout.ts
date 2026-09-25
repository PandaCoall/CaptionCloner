import type { CSSProperties } from "react";
import type { CaptionStyle } from "./schema";
import { fontTracking, fontWeightFor } from "./schema";
import type { TimedWord } from "./transcribe";

export type CaptionLine = {
  words: TimedWord[];
  start: number;
  end: number;
};

const WIDE_WORD = 11;
const PAIR_WITH_WIDE = 8;
const MAX_LINE_CHARS = 18;

export function letterCount(value: string): number {
  return value.replace(/[^\p{L}\p{N}]+/gu, "").length;
}

function lineChars(words: string[]): number {
  if (!words.length) return 0;
  return words.reduce((n, word) => n + letterCount(word), 0) + Math.max(0, words.length - 1);
}

export function shouldStartNewLine(
  current: string[],
  next: string,
  maxPerLine: number,
): boolean {
  if (!current.length) return false;
  const limit = Math.max(1, maxPerLine);
  if (current.length >= limit) return true;
  const nextLen = letterCount(next);
  if (lineChars(current) + 1 + nextLen > MAX_LINE_CHARS) return true;
  const hasWide = current.some((word) => letterCount(word) >= WIDE_WORD);
  if (hasWide && nextLen >= PAIR_WITH_WIDE) return true;
  if (nextLen >= WIDE_WORD && current.some((word) => letterCount(word) >= PAIR_WITH_WIDE)) {
    return true;
  }
  return false;
}

function packWordStrings(words: string[], maxPerLine: number): string[][] {
  const lines: string[][] = [];
  let chunk: string[] = [];
  for (const word of words) {
    if (shouldStartNewLine(chunk, word, maxPerLine)) {
      lines.push(chunk);
      chunk = [];
    }
    chunk.push(word);
  }
  if (chunk.length) lines.push(chunk);
  return lines;
}

export function wrapWords(text: string, maxPerLine: number): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [[""]];

  const packed = normalized
    .split("\n")
    .map((line) => line.trim().split(/\s+/).filter(Boolean))
    .filter((line) => line.length > 0)
    .flatMap((line) => packWordStrings(line, maxPerLine));

  return packed.length ? packed : [[""]];
}

function toLine(chunk: TimedWord[]): CaptionLine {
  return {
    words: chunk,
    start: chunk[0]?.start ?? 0,
    end: chunk[chunk.length - 1]?.end ?? 0,
  };
}

export function groupTimedLines(words: TimedWord[], maxPerLine: number): CaptionLine[] {
  const lines: CaptionLine[] = [];
  let chunk: TimedWord[] = [];
  for (const word of words) {
    const prev = chunk[chunk.length - 1];
    const pause = prev ? word.start - prev.end : 0;
    const labels = chunk.map((item) => item.text);
    if (
      (chunk.length > 0 && pause > 0.55) ||
      shouldStartNewLine(labels, word.text, maxPerLine)
    ) {
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

export function activeBlockAt(
  lines: CaptionLine[],
  time: number,
  linesPerBlock = 2,
): CaptionLine[] {
  if (!lines.length) return [];
  const current = activeLineAt(lines, time);
  if (!current) return lines.slice(0, Math.max(1, linesPerBlock));
  const idx = Math.max(0, lines.indexOf(current));
  const size = Math.max(1, linesPerBlock);
  const start = Math.floor(idx / size) * size;
  return lines.slice(start, start + size);
}

export function boxMetrics(style: CaptionStyle, scale: number) {
  return {
    padX: Math.max(0, style["box-pad-x"] * scale),
    padY: Math.max(0, style["box-pad-y"] * scale),
    radius: Math.max(0, style["box-radius"] * scale),
    gap: Math.max(0, style["box-gap"] * scale),
  };
}

export function stackGap(style: CaptionStyle, scale: number): number {
  if (style["has-box"]) return boxMetrics(style, scale).gap;
  const stroke = Math.max(0, style["outline-width"] * scale);
  return Math.max(8, style["font-size"] * scale * 0.28 + stroke * 0.35);
}

export function wordGapPx(style: CaptionStyle, scale: number, spaceWidth: number): number {
  const stroke = style["has-box"] ? 0 : Math.max(0, style["outline-width"] * scale);
  return Math.max(spaceWidth * 1.45, stroke * 1.7);
}

export function captionTextStyle(style: CaptionStyle, scale: number): CSSProperties {
  const boxed = style["has-box"];
  const stroke = boxed ? 0 : Math.max(0, style["outline-width"] * scale);
  const shadow = boxed ? 0 : Math.max(0, style["shadow-offset"] * scale);
  return {
    fontFamily: `"${style["font-family"]}", sans-serif`,
    fontSize: `${style["font-size"] * scale}px`,
    fontWeight: fontWeightFor(style["font-family"]),
    fontStyle: style.italic ? "italic" : "normal",
    lineHeight: 1.18,
    letterSpacing: fontTracking(style["font-family"]),
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

export function chipHighlight(style: CaptionStyle): boolean {
  return !style["has-box"] && style["box-radius"] > 0;
}

export function motionFrame(
  kind: CaptionStyle["animation"],
  elapsed: number,
): { scale: number; opacity: number } {
  if (kind === "none" || elapsed < 0) return { scale: 1, opacity: 1 };
  const dur = kind === "punch" ? 0.16 : 0.28;
  const t = Math.min(1, Math.max(0, elapsed / dur));
  if (kind === "pop") {
    const c1 = 1.55;
    const c3 = c1 + 1;
    const eased = 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
    return { scale: 0.32 + 0.68 * eased, opacity: Math.min(1, t * 2.4) };
  }
  const slam = 1 - (1 - t) ** 3;
  return { scale: 1.62 + (1 - 1.62) * slam, opacity: Math.min(1, t * 5) };
}
