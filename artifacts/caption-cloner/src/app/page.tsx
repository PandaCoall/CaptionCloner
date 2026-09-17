"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DropZone } from "@/components/DropZone";
import { ErrorBanner } from "@/components/ErrorBanner";
import { LooksStrip } from "@/components/LooksStrip";
import { RenderPanel } from "@/components/RenderPanel";
import { StylePanel } from "@/components/StylePanel";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { VideoDrop } from "@/components/VideoDrop";
import type { TimedWord } from "@/lib/ass";
import type { Look } from "@/lib/looks";
import { OUTLINE_LOOK } from "@/lib/looks";
import { decodeVideoToWavBlob, transcribeLocalAudio, transcribeSample } from "@/lib/local-whisper";
import { DEFAULT_STYLE, FALLBACK_GRADIENT, type CaptionStyle } from "@/lib/schema";
import {
  loadSavedStyles,
  persistSavedStyles,
  type SavedStyle,
} from "@/lib/storage";

type AppError = {
  message: string;
  details?: string[];
  retry?: "extract" | "render" | "whisper";
};

export default function HomePage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const lastImage = useRef<File | null>(null);
  const lastVideo = useRef<File | null>(null);

  const [extracting, setExtracting] = useState(false);
  const [styleReady, setStyleReady] = useState(true);
  const [style, setStyle] = useState<CaptionStyle>(DEFAULT_STYLE);
  const [background, setBackground] = useState(FALLBACK_GRADIENT);
  const [caption, setCaption] = useState(OUTLINE_LOOK.caption);
  const [highlight, setHighlight] = useState(OUTLINE_LOOK.highlight);
  const [saved, setSaved] = useState<SavedStyle[]>([]);

  const [videoUrl, setVideoUrl] = useState("");
  const [videoLocalUrl, setVideoLocalUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const [rendering, setRendering] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [videoResultUrl, setVideoResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [lookId, setLookId] = useState<string>(OUTLINE_LOOK.id);
  const [words, setWords] = useState<TimedWord[]>([]);
  const [transcript, setTranscript] = useState("");
  const [whisperModel, setWhisperModel] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [whisperStatus, setWhisperStatus] = useState<string | null>(null);
  const [whisperProgress, setWhisperProgress] = useState(0);

  useEffect(() => {
    setSaved(loadSavedStyles());
  }, []);

  const onWhisperProgress = useCallback((message: string, pct?: number) => {
    setWhisperStatus(message);
    if (typeof pct === "number") setWhisperProgress(pct);
  }, []);

  const runLocalTranscript = useCallback(
    async (source: "sample" | File) => {
      setError(null);
      setTranscribing(true);
      setWhisperProgress(0);
      try {
        const result =
          source === "sample"
            ? await transcribeSample(onWhisperProgress)
            : await transcribeLocalAudio(await decodeVideoToWavBlob(source), onWhisperProgress);
        setTranscript(result.text);
        setWords(result.words);
        setWhisperModel(result.model);
        if (result.text) setCaption(result.text);
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : "Local Whisper failed",
          retry: "whisper",
        });
      } finally {
        setTranscribing(false);
      }
    },
    [onWhisperProgress],
  );

  const extractFile = useCallback(async (file: File) => {
    lastImage.current = file;
    setError(null);
    setExtracting(true);
    setVideoResultUrl(null);
    setStatus(null);

    const form = new FormData();
    form.append("image", file);

    try {
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError({
          message: data.error || `Extract failed with HTTP ${res.status}`,
          details: data.errors,
          retry: "extract",
        });
        return;
      }

      setStyle(data.style);
      setBackground(data.background || FALLBACK_GRADIENT);
      setCaption(data.caption || "JUST TO SELL");
      setHighlight(data.highlight || "");
      setStyleReady(true);
      setLookId("custom");
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Network failure talking to /api/extract",
        retry: "extract",
      });
    } finally {
      setExtracting(false);
    }
  }, []);

  function onImage(file: File) {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    void extractFile(file);
  }

  function onVideo(file: File) {
    lastVideo.current = file;
    setVideoFile(file);
    setVideoLocalUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setError(null);
    void runLocalTranscript(file);
  }

  function pickLook(look: Look) {
    setLookId(look.id);
    setStyle(look.style);
    setBackground(look.background);
    setCaption(look.caption);
    setHighlight(look.highlight);
    setStyleReady(true);
  }

  function saveStyle(name: string) {
    const next = [
      ...saved.filter((s) => s.name !== name),
      { name, style, background, caption, highlight },
    ];
    setSaved(next);
    persistSavedStyles(next);
  }

  function deleteStyle(name: string) {
    const next = saved.filter((s) => s.name !== name);
    setSaved(next);
    persistSavedStyles(next);
  }

  async function startRender() {
    setError(null);
    setVideoResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setRendering(true);
    setStatus("Transcribing speech and burning captions…");

    const form = new FormData();
    form.append("style", JSON.stringify(style));
    if (videoFile) form.append("video", videoFile);
    if (videoUrl.trim()) form.append("videoUrl", videoUrl.trim());

    try {
      const res = await fetch("/api/render", { method: "POST", body: form });
      const type = res.headers.get("content-type") || "";

      if (!res.ok) {
        const data = type.includes("application/json")
          ? await res.json().catch(() => ({}))
          : {};
        setRendering(false);
        setStatus(null);
        setError({
          message: data.error || `Render failed with HTTP ${res.status}`,
          details: data.errors,
          retry: "render",
        });
        return;
      }

      const blob = await res.blob();
      setVideoResultUrl(URL.createObjectURL(blob));
      setStatus("done");
      setRendering(false);
    } catch (err) {
      setRendering(false);
      setStatus(null);
      setError({
        message: err instanceof Error ? err.message : "Network failure talking to /api/render",
        retry: "render",
      });
    }
  }

  function retry() {
    if (error?.retry === "extract" && lastImage.current) {
      void extractFile(lastImage.current);
      return;
    }
    if (error?.retry === "whisper") {
      if (lastVideo.current) void runLocalTranscript(lastVideo.current);
      else void runLocalTranscript("sample");
      return;
    }
    if (error?.retry === "render") {
      void startRender();
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.28em] text-amber-400">Caption Cloner · Path 1</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
          Local Whisper. Starter looks. No xAI key.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Pick a preset style, then transcribe speech in this browser with Whisper tiny.en.
          Screenshot clone still exists as an optional extra and is the only step that needs an API.
        </p>
      </header>

      <div className="space-y-6">
        <LooksStrip activeId={lookId} onPick={pickLook} />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={transcribing}
            onClick={() => void runLocalTranscript("sample")}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300 disabled:opacity-50"
          >
            {transcribing ? "Transcribing…" : "Test Path 1 · JFK sample"}
          </button>
          <p className="self-center text-xs text-zinc-500">
            Downloads a public 11s clip and runs Whisper on-device. No XAI_API_KEY.
          </p>
        </div>

        <TranscriptPanel
          text={transcript}
          words={words}
          model={whisperModel}
          loading={transcribing}
          status={whisperStatus}
          progress={whisperProgress}
        />

        {saved.length > 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Saved styles</p>
            <div className="flex flex-wrap gap-2">
              {saved.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => {
                    setStyle(entry.style);
                    setBackground(entry.background);
                    if (entry.caption) setCaption(entry.caption);
                    if (entry.highlight) setHighlight(entry.highlight);
                    setStyleReady(true);
                    setLookId("saved");
                  }}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:border-amber-400"
                >
                  {entry.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <DropZone previewUrl={previewUrl} extracting={extracting} onFile={onImage} />

        {error && (
          <ErrorBanner
            message={error.message}
            details={error.details}
            onRetry={error.retry ? retry : undefined}
          />
        )}

        {styleReady && (
          <>
            <StylePanel
              style={style}
              background={background}
              caption={caption}
              highlight={highlight}
              saved={saved}
              onChange={setStyle}
              onBackgroundChange={setBackground}
              onCaptionChange={setCaption}
              onHighlightChange={setHighlight}
              onSave={saveStyle}
              onLoad={(entry) => {
                setStyle(entry.style);
                setBackground(entry.background);
                if (entry.caption) setCaption(entry.caption);
                if (entry.highlight) setHighlight(entry.highlight);
                setStyleReady(true);
              }}
              onDelete={deleteStyle}
            />
            <VideoDrop
              localUrl={videoLocalUrl}
              remoteUrl={videoUrl}
              uploading={transcribing}
              onFile={onVideo}
              onUrl={setVideoUrl}
            />
            <RenderPanel
              rendering={rendering}
              status={status}
              videoResultUrl={videoResultUrl}
              canRender={Boolean(videoFile || videoUrl.trim())}
              onRender={startRender}
              onRetry={retry}
              canRetry={Boolean(error?.retry === "render") && !rendering}
            />
          </>
        )}
      </div>
    </main>
  );
}
