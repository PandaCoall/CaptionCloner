"use client";

import type { CaptionStyle } from "@/lib/schema";

type Props = {
  style: CaptionStyle;
  background: string;
  caption: string;
  highlight: string;
};

function wrapWords(text: string, maxPerLine: number): string[][] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const limit = Math.max(1, maxPerLine);
  const lines: string[][] = [];
  for (let i = 0; i < words.length; i += limit) {
    lines.push(words.slice(i, i + limit));
  }
  return lines.length ? lines : [[""]];
}

export function CaptionPreview({ style, background, caption, highlight }: Props) {
  const lines = wrapWords(caption || "JUST TO SELL", style["max-words-per-line"]);
  const accent = highlight.trim().toLowerCase();

  return (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl bg-black p-3">
      <div
        className="relative overflow-hidden shadow-2xl"
        style={{
          width: "100%",
          maxWidth: 270,
          aspectRatio: "1080 / 1920",
        }}
      >
        <div className="absolute inset-0" style={{ background }} />
        <div
          className="absolute left-0 right-0 px-3 text-center"
          style={{ top: `${(style.y / 1920) * 100}%` }}
        >
          <p
            className="mx-auto font-bold uppercase leading-none"
            style={{
              fontFamily: `"${style["font-family"]}", sans-serif`,
              fontSize: `${style["font-size"] * (270 / 1080)}px`,
              WebkitTextStroke: `${style["outline-width"] * (270 / 1080)}px ${style["outline-color"]}`,
              paintOrder: "stroke fill",
              textShadow:
                style["shadow-offset"] > 0
                  ? `${style["shadow-offset"] * (270 / 1080)}px ${style["shadow-offset"] * (270 / 1080)}px 0 ${style["shadow-color"]}`
                  : "none",
              wordBreak: "break-word",
            }}
          >
            {lines.map((line, li) => (
              <span key={li}>
                {line.map((word, wi) => (
                  <span
                    key={`${li}-${wi}`}
                    style={{
                      color:
                        word.toLowerCase().replace(/[^\w]/g, "") ===
                        accent.replace(/[^\w]/g, "")
                          ? style["word-color"]
                          : style["line-color"],
                    }}
                  >
                    {word}
                    {wi < line.length - 1 ? " " : ""}
                  </span>
                ))}
                {li < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
}
