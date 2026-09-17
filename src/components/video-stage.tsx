import { Film } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TimedWord } from "@/lib/transcribe";
import { cn } from "@/lib/utils";

type Props = {
  hasVideo: boolean;
  transcribing: boolean;
  exporting: boolean;
  exportProgress: number;
  whisperStatus?: string | null;
  whisperProgress?: number;
  words: TimedWord[];
  transcript: string;
  onFile: (file: File) => void;
  onTranscribe: () => void;
  onSampleSpeech?: () => void;
  onExport: () => void;
  canTranscribe: boolean;
  canExport: boolean;
  downloadUrl: string | null;
};

export function VideoStage({
  hasVideo,
  transcribing,
  exporting,
  exportProgress,
  whisperStatus,
  whisperProgress,
  words,
  transcript,
  onFile,
  onTranscribe,
  onSampleSpeech,
  onExport,
  canTranscribe,
  canExport,
  downloadUrl,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function accept(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("video/") && file.type !== "audio/wav") return;
    onFile(file);
  }

  return (
    <section className="rounded-xl bg-elevated p-4 shadow-[var(--shadow-border)]">
      <h2 className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-muted">
        3 · Dialogue clip
      </h2>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Speech is transcribed on this device with Whisper. Timed words get the look you picked.
      </p>

      {!hasVideo ? (
        <button
          type="button"
          disabled={transcribing || exporting}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            accept(e.dataTransfer.files[0]);
          }}
          className={cn(
            "relative mb-4 flex min-h-40 w-full flex-col items-center justify-center overflow-hidden rounded-sm bg-subtle",
            over ? "shadow-[var(--shadow-border-hover)]" : "shadow-[var(--shadow-border)]",
          )}
        >
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <Film className="size-7 text-muted" strokeWidth={1.5} />
            <div>
              <p className="text-base font-medium text-fg">Drop the talking clip</p>
              <p className="mt-1 text-sm text-muted">MP4, MOV or WebM · under 90 seconds</p>
            </div>
          </div>
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v,audio/wav"
        className="hidden"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {!hasVideo && onSampleSpeech ? (
        <div className="mb-2">
          <Button type="button" variant="secondary" disabled={transcribing} onClick={onSampleSpeech}>
            Test Path 1 · sample speech
          </Button>
        </div>
      ) : null}

      {hasVideo ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" disabled={!canTranscribe || transcribing} onClick={onTranscribe}>
              {transcribing ? "Transcribing…" : words.length ? "Re-transcribe" : "Transcribe speech"}
            </Button>
            <Button type="button" disabled={!canExport || exporting} onClick={onExport}>
              {exporting ? `Preparing ${Math.round(exportProgress * 100)}%` : "Download captioned video"}
            </Button>
            {downloadUrl ? (
              <Button asChild variant="outline">
                <a href={downloadUrl} download="caption-cloner.webm">
                  Save again
                </a>
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => inputRef.current?.click()}>
              Replace clip
            </Button>
          </div>

          {transcribing ? (
            <div>
              <p className="text-sm text-muted">{whisperStatus || "Loading Whisper…"}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-subtle">
                <div
                  className="h-full bg-accent transition-[width] duration-[var(--motion-quick)] ease-[var(--ease-out)]"
                  style={{ width: `${Math.round((whisperProgress ?? 0) * 100)}%` }}
                />
              </div>
            </div>
          ) : null}

          {exporting ? (
            <div className="h-1 overflow-hidden rounded-full bg-subtle">
              <div
                className="h-full bg-accent transition-[width] duration-[var(--motion-quick)] ease-[var(--ease-out)]"
                style={{ width: `${Math.round(exportProgress * 100)}%` }}
              />
            </div>
          ) : null}

          {words.length ? (
            <p className="text-sm text-muted">
              <span className="tabular-nums text-fg">{words.length}</span> words timed on this device
              {transcript ? <span className="mt-1 block text-xs leading-relaxed">{transcript}</span> : null}
            </p>
          ) : transcribing ? null : (
            <p className="text-sm text-muted">Clip loaded. Transcribe to burn captions.</p>
          )}
        </div>
      ) : transcribing ? (
        <div className="mt-3">
          <p className="text-sm text-muted">{whisperStatus || "Loading Whisper…"}</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-subtle">
            <div
              className="h-full bg-accent transition-[width] duration-[var(--motion-quick)] ease-[var(--ease-out)]"
              style={{ width: `${Math.round((whisperProgress ?? 0) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
