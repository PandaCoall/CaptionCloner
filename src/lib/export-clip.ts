import type { CaptionStyle } from "./schema";
import { fontTracking, fontWeightFor } from "./schema";
import {
  activeBlockAt,
  activeLineAt,
  boxMetrics,
  groupTimedLines,
  motionFrame,
  normalizeWord,
  wordGapPx,
  wrapWords,
  type CaptionLine,
} from "./caption-layout";
import type { TimedWord } from "./transcribe";

export const DOWNLOAD_NAME = "caption-cloner.webm";

function pickRecorderMime(): string {
  const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  for (const type of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "video/webm";
}

export function triggerDownload(blob: Blob, filename = DOWNLOAD_NAME): string {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return url;
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fill();
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  style: CaptionStyle,
  parts: { text: string; active: boolean }[],
  highlightLine: boolean,
  canvasW: number,
  y: number,
  scale: number,
  elapsed: number,
): number {
  const fontSize = Math.max(12, style["font-size"] * scale);
  const weight = fontWeightFor(style["font-family"]);
  const font = `${style.italic ? "italic " : ""}${weight} ${fontSize}px "${style["font-family"]}", sans-serif`;
  const stroke = style["has-box"] ? 0 : Math.max(0, style["outline-width"] * scale);
  const shadow = style["has-box"] ? 0 : Math.max(0, style["shadow-offset"] * scale);
  const box = boxMetrics(style, scale);
  const chipWord = !style["has-box"] && style["box-radius"] > 0;
  ctx.font = font;
  ctx.letterSpacing = fontTracking(style["font-family"]);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = Math.max(1, stroke * 2);
  ctx.strokeStyle = style["outline-color"];

  const gap = wordGapPx(style, scale, ctx.measureText(" ").width);
  const widths = parts.map((p) => {
    const w = ctx.measureText(p.text).width;
    return chipWord && p.active ? w + box.padX * 2 : w;
  });
  const total = widths.reduce((n, w, i) => n + w + (i ? gap : 0), 0);
  const lineH = style["has-box"] || chipWord
    ? fontSize + box.padY * 2
    : fontSize * 1.22;
  const motion = motionFrame(style.animation, elapsed);
  ctx.save();
  const cx = canvasW / 2;
  const cy = y + lineH / 2;
  ctx.translate(cx, cy);
  ctx.scale(motion.scale, motion.scale);
  ctx.globalAlpha = motion.opacity;
  ctx.translate(-cx, -cy);
  let cursor = (canvasW - total) / 2;
  let textY = y;

  if (style["has-box"]) {
    const boxW = total + box.padX * 2;
    const boxX = (canvasW - boxW) / 2;
    ctx.fillStyle = highlightLine ? style["word-box-color"] : style["box-color"];
    fillRoundRect(ctx, boxX, y, boxW, lineH, box.radius);
    cursor = boxX + box.padX;
    textY = y + box.padY;
  }

  parts.forEach((part, i) => {
    let textX = cursor;
    if (chipWord && part.active) {
      ctx.fillStyle = style["word-box-color"];
      fillRoundRect(ctx, cursor, y, widths[i], lineH, box.radius);
      textX = cursor + box.padX;
      textY = y + box.padY;
    }
    ctx.fillStyle = part.active ? style["word-color"] : style["line-color"];
    if (shadow) {
      ctx.shadowColor = style["shadow-color"];
      ctx.shadowOffsetX = shadow;
      ctx.shadowOffsetY = shadow;
      ctx.shadowBlur = 0;
    }
    if (stroke > 0) ctx.strokeText(part.text, textX, textY);
    ctx.shadowColor = "transparent";
    ctx.fillText(part.text, textX, textY);
    cursor += widths[i] + gap;
  });

  ctx.restore();
  return lineH + (style["has-box"] ? box.gap : fontSize * 0.12);
}

function drawCaptionStack(
  ctx: CanvasRenderingContext2D,
  style: CaptionStyle,
  caption: string,
  highlight: string,
  canvasW: number,
  canvasH: number,
) {
  const scale = canvasH / 1920;
  const lines = wrapWords(caption || "YOUR WORDS HERE", style["max-words-per-line"]);
  const accent = normalizeWord(highlight);
  let y = (style.y / 1920) * canvasH;
  ctx.save();
  for (const line of lines) {
    const highlightLine = line.some((word) => normalizeWord(word) === accent);
    const parts = line.map((word) => ({
      text: word.toUpperCase(),
      active: normalizeWord(word) === accent,
    }));
    y += drawLine(ctx, style, parts, highlightLine, canvasW, y, scale, (performance.now() / 1000) % 1.4);
  }
  ctx.restore();
}

function drawCaptions(
  ctx: CanvasRenderingContext2D,
  style: CaptionStyle,
  lines: CaptionLine[],
  time: number,
  canvasW: number,
  canvasH: number,
) {
  const visible = style["has-box"]
    ? [activeLineAt(lines, time)].filter((line): line is CaptionLine => Boolean(line))
    : activeBlockAt(lines, time, 2);
  if (!visible.length) return;
  const scale = canvasH / 1920;
  let y = (style.y / 1920) * canvasH;
  ctx.save();
  for (const line of visible) {
    const current = line.words.find((w) => time >= w.start && time <= w.end + 0.05);
    const parts = line.words.map((w) => ({
      text: w.text.toUpperCase(),
      active: Boolean(current && w === current),
    }));
    y += drawLine(ctx, style, parts, Boolean(current), canvasW, y, scale, time - line.start);
  }
  ctx.restore();
}

function splitGradientArgs(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function fillCssBackground(
  ctx: CanvasRenderingContext2D,
  css: string,
  w: number,
  h: number,
) {
  const trimmed = css.trim();
  const match = trimmed.match(/^linear-gradient\((.+)\)$/i);
  if (!match?.[1]) {
    ctx.fillStyle = "#0a0a0b";
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const parts = splitGradientArgs(match[1]);
  let angleDeg = 180;
  let start = 0;
  if (parts[0] && /deg/i.test(parts[0])) {
    angleDeg = parseFloat(parts[0]) || 180;
    start = 1;
  }
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  const len = Math.hypot(w, h) / 2;
  const cx = w / 2;
  const cy = h / 2;
  const grad = ctx.createLinearGradient(
    cx - Math.cos(angle) * len,
    cy - Math.sin(angle) * len,
    cx + Math.cos(angle) * len,
    cy + Math.sin(angle) * len,
  );
  const stops = parts.slice(start);
  stops.forEach((stop, idx) => {
    const found = stop.match(/(#[0-9A-Fa-f]{3,8})\s*(\d+(?:\.\d+)?)?%/);
    if (!found?.[1]) return;
    let hex = found[1];
    if (hex.length === 4) hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    const pct =
      found[2] != null ? Number(found[2]) / 100 : idx / Math.max(1, stops.length - 1);
    grad.addColorStop(Math.min(1, Math.max(0, pct)), hex);
  });
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  iw: number,
  ih: number,
  w: number,
  h: number,
) {
  const ir = iw / ih;
  const cr = w / h;
  let dw = w;
  let dh = h;
  let dx = 0;
  let dy = 0;
  if (ir > cr) {
    dh = h;
    dw = h * ir;
    dx = (w - dw) / 2;
  } else {
    dw = w;
    dh = w / ir;
    dy = (h - dh) / 2;
  }
  ctx.drawImage(image, dx, dy, dw, dh);
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  return img;
}

async function recordCanvas(params: {
  canvas: HTMLCanvasElement;
  draw: () => void;
  durationMs: number;
  audioStream?: MediaStream;
  onProgress?: (ratio: number) => void;
}): Promise<Blob> {
  const canvasStream = params.canvas.captureStream(30);
  const tracks = [
    ...canvasStream.getVideoTracks(),
    ...(params.audioStream?.getAudioTracks() ?? []),
  ];
  const mixed = new MediaStream(tracks);
  const mimeType = pickRecorderMime();
  const recorder = new MediaRecorder(mixed, { mimeType, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  params.draw();
  recorder.start(250);
  const started = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      params.draw();
      const t = performance.now() - started;
      params.onProgress?.(Math.min(1, t / params.durationMs));
      if (t >= params.durationMs) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
    if (recorder.state !== "inactive") recorder.stop();
    else resolve();
  });
  if (!chunks.length) throw new Error("Export produced an empty file");
  return new Blob(chunks, { type: mimeType });
}

async function readyFont(style: CaptionStyle) {
  try {
    const weight = fontWeightFor(style["font-family"]);
    const spec = `${style.italic ? "italic " : ""}${weight} 72px "${style["font-family"]}"`;
    await document.fonts.load(spec);
    await document.fonts.ready;
  } catch {
    // use fallback
  }
}

export async function exportStillClip(params: {
  style: CaptionStyle;
  caption: string;
  highlight: string;
  background: string;
  imageUrl?: string | null;
  onProgress?: (ratio: number) => void;
}): Promise<Blob> {
  await readyFont(params.style);
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create export canvas");

  let image: HTMLImageElement | null = null;
  if (params.imageUrl) {
    try {
      image = await loadImage(params.imageUrl);
    } catch {
      image = null;
    }
  }

  return recordCanvas({
    canvas,
    durationMs: 4000,
    onProgress: params.onProgress,
    draw: () => {
      if (image) drawCover(ctx, image, image.naturalWidth, image.naturalHeight, 1080, 1920);
      else fillCssBackground(ctx, params.background, 1080, 1920);
      drawCaptionStack(ctx, params.style, params.caption, params.highlight, 1080, 1920);
    },
  });
}

export async function exportCaptionedClip(params: {
  src: string;
  style: CaptionStyle;
  words: TimedWord[];
  caption?: string;
  highlight?: string;
  onProgress?: (ratio: number) => void;
}): Promise<Blob> {
  await readyFont(params.style);
  const video = document.createElement("video");
  video.src = params.src;
  video.playsInline = true;
  video.muted = false;
  video.crossOrigin = "anonymous";
  video.style.position = "fixed";
  video.style.left = "-9999px";
  video.style.width = "1px";
  video.style.height = "1px";
  document.body.appendChild(video);

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not load video for export"));
    });

    const w = video.videoWidth || 1080;
    const h = video.videoHeight || 1920;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create export canvas");

    const lines = groupTimedLines(params.words, params.style["max-words-per-line"]);
    const canvasStream = canvas.captureStream(30);
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    const source = audioCtx.createMediaElementSource(video);
    source.connect(dest);
    source.connect(audioCtx.destination);

    const mixed = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);
    const mimeType = pickRecorderMime();
    const recorder = new MediaRecorder(mixed, { mimeType, videoBitsPerSecond: 5_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    await audioCtx.resume();
    video.currentTime = 0;
    try {
      await video.play();
    } catch {
      video.muted = true;
      await video.play();
    }
    recorder.start(250);

    await new Promise<void>((resolve, reject) => {
      const tick = () => {
        ctx.drawImage(video, 0, 0, w, h);
        if (params.words.length) {
          drawCaptions(
            ctx,
            params.style,
            lines,
            video.currentTime,
            w,
            h,
          );
        } else if (params.caption) {
          drawCaptionStack(ctx, params.style, params.caption, params.highlight || "", w, h);
        }
        if (duration) params.onProgress?.(Math.min(1, video.currentTime / duration));
        if (video.ended) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      video.onended = () => resolve();
      video.onerror = () => reject(new Error("Video failed during export"));
      tick();
    });

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      if (recorder.state !== "inactive") recorder.stop();
      else resolve();
    });

    source.disconnect();
    await audioCtx.close().catch(() => undefined);

    if (!chunks.length) throw new Error("Export produced an empty file");
    return new Blob(chunks, { type: mimeType });
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
  }
}
