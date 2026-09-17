import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { DropZone } from "@/components/drop-zone";
import { LooksStrip } from "@/components/looks-strip";
import { PhoneStage } from "@/components/caption-layer";
import { DownloadButton } from "@/components/download-button";
import { StylePanel } from "@/components/style-panel";
import { VideoStage } from "@/components/video-stage";
import { Button } from "@/components/ui/button";
import { extractStyle } from "@/lib/extract";
import {
  DOWNLOAD_NAME,
  exportCaptionedClip,
  exportStillClip,
  triggerDownload,
} from "@/lib/export-clip";
import {
  BARS_STYLE,
  BOXED_GRADIENT,
  normalizeStyle,
  type CaptionStyle,
  type StyleLook,
} from "@/lib/schema";
import { loadSavedStyles, persistSavedStyles, type SavedStyle } from "@/lib/storage";
import { transcribePcm, WHISPER_MODEL_LABEL } from "@/lib/local-whisper";
import type { TimedWord } from "@/lib/transcribe";
import { compressImage, extractPcmFromMedia } from "@/lib/wav";

export const Route = createFileRoute("/")({ component: Home });

type AppError = { message: string; details?: string[]; retry?: "extract" | "transcribe" | "export" };

function Home() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const lastImage = useRef<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [styleReady, setStyleReady] = useState(true);
  const [style, setStyle] = useState<CaptionStyle>(BARS_STYLE);
  const [background, setBackground] = useState(BOXED_GRADIENT);
  const [caption, setCaption] = useState("STRUGGLE WITH\nANXIETY\nDEPRESSION");
  const [highlight, setHighlight] = useState("DEPRESSION");
  const [activeLook, setActiveLook] = useState<string | null>("Black / red bars");
  const [saved, setSaved] = useState<SavedStyle[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [whisperStatus, setWhisperStatus] = useState<string | null>(null);
  const [whisperProgress, setWhisperProgress] = useState(0);
  const [words, setWords] = useState<TimedWord[]>([]);
  const [transcript, setTranscript] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    setSaved(loadSavedStyles());
  }, []);

  const runExtract = useCallback(async (file: File) => {
    lastImage.current = file;
    setError(null);
    setExtracting(true);
    setActiveLook(null);
    try {
      const { base64, mediaType } = await compressImage(file);
      const result = await extractStyle({ data: { imageBase64: base64, mediaType } });
      if (!result.ok) {
        setError({ message: result.error, details: result.errors, retry: "extract" });
        return;
      }
      setStyle(normalizeStyle(result.style));
      setBackground(result.background);
      setCaption(result.caption);
      setHighlight(result.highlight);
      setStyleReady(true);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Could not read this image",
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
    void runExtract(file);
  }

  const runTranscribe = useCallback(async (file?: File) => {
    const source = file ?? videoFile;
    if (!source) return;
    setError(null);
    setTranscribing(true);
    setWhisperProgress(0);
    setWhisperStatus("Preparing audio…");
    try {
      const pcm = await extractPcmFromMedia(source);
      const result = await transcribePcm(pcm, (message, ratio) => {
        setWhisperStatus(message);
        setWhisperProgress(ratio);
      });
      setWords(result.words);
      setTranscript(result.text);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Could not transcribe this clip on-device",
        retry: "transcribe",
      });
    } finally {
      setTranscribing(false);
    }
  }, [videoFile]);

  function onVideo(file: File) {
    setVideoFile(file);
    setWords([]);
    setTranscript("");
    setDownloadUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setError(null);
    void runTranscribe(file);
  }

  const runExport = useCallback(async () => {
    setError(null);
    setExporting(true);
    setExportProgress(0);
    try {
      let blob: Blob;
      if (videoUrl && words.length) {
        blob = await exportCaptionedClip({
          src: videoUrl,
          style,
          words,
          onProgress: setExportProgress,
        });
      } else if (videoUrl) {
        blob = await exportCaptionedClip({
          src: videoUrl,
          style,
          words: [],
          caption,
          highlight,
          onProgress: setExportProgress,
        });
      } else {
        blob = await exportStillClip({
          style,
          caption,
          highlight,
          background,
          imageUrl: previewUrl,
          onProgress: setExportProgress,
        });
      }
      setDownloadUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return triggerDownload(blob, DOWNLOAD_NAME);
      });
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Export failed",
        retry: "export",
      });
    } finally {
      setExporting(false);
    }
  }, [videoUrl, words, style, caption, highlight, background, previewUrl]);

  function retry() {
    if (error?.retry === "extract" && lastImage.current) void runExtract(lastImage.current);
    if (error?.retry === "transcribe") void runTranscribe();
    if (error?.retry === "export") void runExport();
  }

  function saveStyle(name: string) {
    const next = [
      ...saved.filter((s) => s.name !== name),
      { name, style, background, caption, highlight },
    ];
    setSaved(next);
    persistSavedStyles(next);
    setActiveLook(name);
  }

  function loadLook(entry: StyleLook | SavedStyle) {
    setStyle(normalizeStyle(entry.style));
    setBackground(entry.background);
    if (entry.caption) setCaption(entry.caption);
    if (entry.highlight) setHighlight(entry.highlight);
    setActiveLook(entry.name);
    setStyleReady(true);
    setError(null);
  }

  async function loadSample() {
    try {
      const res = await fetch("/samples/style-ref.jpg");
      if (!res.ok) throw new Error("Sample still is missing");
      const blob = await res.blob();
      const file = new File([blob], "style-ref.jpg", { type: blob.type || "image/jpeg" });
      onImage(file);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Could not load the sample still",
      });
    }
  }

  async function loadSampleSpeech() {
    try {
      const res = await fetch("/samples/jfk-talk.mp4");
      if (!res.ok) throw new Error("Sample speech clip is missing");
      const blob = await res.blob();
      const file = new File([blob], "jfk-talk.mp4", { type: "video/mp4" });
      onVideo(file);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Could not load the sample speech clip",
      });
    }
  }

  function startOver() {
    lastImage.current = null;
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setDownloadUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setVideoFile(null);
    setWords([]);
    setTranscript("");
    setStyleReady(true);
    setStyle(BARS_STYLE);
    setBackground(BOXED_GRADIENT);
    setCaption("STRUGGLE WITH\nANXIETY\nDEPRESSION");
    setHighlight("DEPRESSION");
    setActiveLook("Black / red bars");
    setError(null);
    setExportProgress(0);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted">
            Caption Cloner · {WHISPER_MODEL_LABEL}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.03em] text-fg sm:text-5xl">
            Steal the type. Stamp the speech.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            Pick a boxed look, then transcribe a talking clip on this device — no speech API.
            Screenshot clone is optional.
          </p>
        </div>
        {styleReady ? (
          <Button type="button" variant="ghost" onClick={startOver}>
            Start over
          </Button>
        ) : null}
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="order-2 space-y-5 lg:order-1">
          <LooksStrip activeName={activeLook ?? undefined} saved={saved} onPick={loadLook} />

          <DropZone
            previewUrl={previewUrl}
            extracting={extracting}
            onFile={onImage}
            onSample={loadSample}
          />

          {error ? (
            <div className="rounded-xl bg-elevated p-4 text-sm text-fg shadow-[var(--shadow-border)]">
              <p className="font-medium">{error.message}</p>
              {error.details?.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-xs text-muted">
                  {error.details.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {error.retry ? (
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={retry}>
                  Retry
                </Button>
              ) : null}
            </div>
          ) : null}

          {styleReady ? (
            <>
              <StylePanel
                style={style}
                caption={caption}
                highlight={highlight}
                saved={saved}
                onChange={(next) => {
                  setStyle(next);
                  setActiveLook(null);
                }}
                onCaptionChange={setCaption}
                onHighlightChange={setHighlight}
                onSave={saveStyle}
                onLoad={loadLook}
                onDelete={(name) => {
                  const next = saved.filter((s) => s.name !== name);
                  setSaved(next);
                  persistSavedStyles(next);
                }}
              />
              <VideoStage
                hasVideo={Boolean(videoUrl)}
                transcribing={transcribing}
                exporting={exporting}
                exportProgress={exportProgress}
                whisperStatus={whisperStatus}
                whisperProgress={whisperProgress}
                words={words}
                transcript={transcript}
                onFile={onVideo}
                onTranscribe={() => void runTranscribe()}
                onSampleSpeech={() => void loadSampleSpeech()}
                onExport={() => void runExport()}
                canTranscribe={Boolean(videoFile) && !transcribing}
                canExport={!exporting}
                downloadUrl={downloadUrl}
              />
            </>
          ) : null}
        </div>

        <aside className="order-1 lg:sticky lg:top-8 lg:order-2">
          <PhoneStage
            style={style}
            background={background}
            caption={caption}
            highlight={highlight}
            videoUrl={videoUrl}
            words={words}
            extracting={extracting}
            ready={styleReady}
          />
          <DownloadButton
            exporting={exporting}
            exportProgress={exportProgress}
            downloadUrl={downloadUrl}
            onDownload={() => void runExport()}
          />
        </aside>
      </div>
    </main>
  );
}
