import { ImageIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  previewUrl: string | null;
  extracting: boolean;
  onFile: (file: File) => void;
  onSample?: () => void;
};

export function DropZone({ previewUrl, extracting, onFile, onSample }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function accept(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    onFile(file);
  }

  return (
    <section className="rounded-xl bg-elevated p-4 shadow-[var(--shadow-border)]">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          1 · Style reference
        </h2>
        {extracting ? <span className="text-xs text-fg">Reading type…</span> : null}
      </div>

      <button
        type="button"
        disabled={extracting}
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
          "relative flex w-full flex-col items-center justify-center overflow-hidden rounded-sm bg-subtle transition-[box-shadow,opacity] duration-[var(--motion-quick)] ease-[var(--ease-out)]",
          previewUrl ? "min-h-36" : "min-h-52",
          over ? "shadow-[var(--shadow-border-hover)]" : "shadow-[var(--shadow-border)]",
          extracting ? "cursor-wait opacity-80" : "cursor-pointer",
        )}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Style reference frame"
            className="max-h-64 w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <ImageIcon className="size-7 text-muted" strokeWidth={1.5} />
            <div>
              <p className="text-base font-medium text-fg">Drop a caption screenshot</p>
              <p className="mt-1 text-sm text-muted">
                Outline, bars, pills · PNG, JPEG, WebP
              </p>
            </div>
          </div>
        )}
        {extracting ? (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/70">
            <div className="size-9 animate-spin rounded-full border-2 border-muted border-t-fg" />
          </div>
        ) : null}
      </button>

      <div className="mt-3 flex flex-wrap gap-2">
        {previewUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={extracting}
            onClick={() => inputRef.current?.click()}
          >
            Replace still
          </Button>
        ) : onSample ? (
          <Button type="button" variant="secondary" disabled={extracting} onClick={onSample}>
            Try a sample still
          </Button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </section>
  );
}
