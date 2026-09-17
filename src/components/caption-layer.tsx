import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CaptionStyle } from "@/lib/schema";
import {
  activeBlockAt,
  activeLineAt,
  captionTextStyle,
  groupTimedLines,
  normalizeWord,
  plateStyle,
  stackGap,
  wrapWords,
} from "@/lib/caption-layout";
import type { TimedWord } from "@/lib/transcribe";

function CaptionBlock({
  style,
  scale,
  lines,
  accent,
}: {
  style: CaptionStyle;
  scale: number;
  lines: string[][];
  accent: string;
}) {
  const wordStyle = captionTextStyle(style, scale);
  const gap = stackGap(style, scale);

  return (
    <div className="mx-auto flex flex-col items-center" style={{ gap }}>
      {lines.map((line, li) => {
        const highlightLine = line.some((word) => normalizeWord(word) === accent);
        return (
          <span
            key={li}
            className="inline-block max-w-full"
            style={plateStyle(style, scale, highlightLine)}
          >
            {line.map((word, wi) => (
              <span
                key={`${li}-${wi}`}
                style={{
                  ...wordStyle,
                  color:
                    normalizeWord(word) === accent ? style["word-color"] : style["line-color"],
                }}
              >
                {word}
                {wi < line.length - 1 ? " " : ""}
              </span>
            ))}
          </span>
        );
      })}
    </div>
  );
}

export function StaticCaption({
  style,
  caption,
  highlight,
  frameHeight,
}: {
  style: CaptionStyle;
  caption: string;
  highlight: string;
  frameHeight: number;
}) {
  const lines = wrapWords(caption || "YOUR WORDS HERE", style["max-words-per-line"]);
  const accent = normalizeWord(highlight);
  const scale = frameHeight / 1920;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 px-3"
      style={{ top: `${(style.y / 1920) * 100}%` }}
    >
      <CaptionBlock style={style} scale={scale} lines={lines} accent={accent} />
    </div>
  );
}

export function LiveCaptionOverlay({
  style,
  words,
  time,
  frameHeight,
}: {
  style: CaptionStyle;
  words: TimedWord[];
  time: number;
  frameHeight: number;
}) {
  const lines = groupTimedLines(words, style["max-words-per-line"]);
  const visible = style["has-box"]
    ? (() => {
        const line = activeLineAt(lines, time);
        return line ? [line] : [];
      })()
    : activeBlockAt(lines, time, 2);
  if (!visible.length) return null;
  const scale = frameHeight / 1920;
  const wordStyle = captionTextStyle(style, scale);
  const gap = stackGap(style, scale);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 flex justify-center px-3"
      style={{ top: `${(style.y / 1920) * 100}%` }}
    >
      <div className="flex w-full flex-col items-center" style={{ gap }}>
        {visible.map((line, li) => {
          const current = line.words.find((w) => time >= w.start && time <= w.end + 0.08);
          const highlightLine = Boolean(current);
          return (
            <span
              key={`${line.start}-${li}`}
              className="inline-block max-w-full"
              style={plateStyle(style, scale, highlightLine)}
            >
              {line.words.map((word, i) => (
                <span
                  key={`${word.start}-${i}`}
                  style={{
                    ...wordStyle,
                    color: current === word ? style["word-color"] : style["line-color"],
                  }}
                >
                  {word.text}
                  {i < line.words.length - 1 ? " " : ""}
                </span>
              ))}
            </span>
          );
        })}
      </div>
    </div>
  );
}

type PhoneStageProps = {
  style: CaptionStyle;
  background: string;
  caption: string;
  highlight: string;
  videoUrl: string | null;
  words: TimedWord[];
  extracting?: boolean;
  ready?: boolean;
};

export function PhoneStage({
  style,
  background,
  caption,
  highlight,
  videoUrl,
  words,
  extracting,
  ready,
}: PhoneStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [frameH, setFrameH] = useState(480);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => setFrameH(frame.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [videoUrl]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => setTime(el.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [videoUrl]);

  function toggle() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }

  const captionNote =
    videoUrl && words.length
      ? "Captions timed to the spoken words"
      : videoUrl
        ? "Transcribe to stamp speech onto this style"
        : ready
          ? "Cloned type on the extracted look"
          : "Pick a boxed look, or drop a still";

  return (
    <div className="mx-auto w-full max-w-[300px]">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted">Preview</p>
      <div className="rounded-xl bg-subtle p-3 shadow-[var(--shadow-border)]">
        <div
          ref={frameRef}
          className="relative overflow-hidden rounded-md bg-bg"
          style={{ aspectRatio: "9 / 16" }}
        >
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
              onClick={toggle}
            />
          ) : (
            <div className="absolute inset-0" style={{ background }} />
          )}

          {videoUrl && words.length ? (
            <LiveCaptionOverlay style={style} words={words} time={time} frameHeight={frameH} />
          ) : (
            <StaticCaption
              style={style}
              caption={caption}
              highlight={highlight}
              frameHeight={frameH}
            />
          )}

          {extracting ? (
            <div className="absolute inset-0 flex items-center justify-center bg-bg/70">
              <div className="size-9 animate-spin rounded-full border-2 border-muted border-t-fg" />
            </div>
          ) : null}

          {videoUrl && !playing && !extracting ? (
            <button
              type="button"
              onClick={toggle}
              className="absolute inset-0 flex items-center justify-center"
              aria-label="Play clip"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg">
                <Play className="size-5 translate-x-px" fill="currentColor" />
              </span>
            </button>
          ) : null}

          {videoUrl && playing ? (
            <button
              type="button"
              onClick={toggle}
              className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-bg/70 text-fg"
              aria-label="Pause clip"
            >
              <Pause className="size-4" fill="currentColor" />
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-center text-xs leading-relaxed text-muted">{captionNote}</p>
    </div>
  );
}
