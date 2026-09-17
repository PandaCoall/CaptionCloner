"use client";

import { useRef, useState } from "react";

type Props = {
  previewUrl: string | null;
  extracting: boolean;
  onFile: (file: File) => void;
};

export function DropZone({ previewUrl, extracting, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function accept(file: File | undefined) {
    if (!file) return;
    onFile(file);
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-400">
          1 · Style reference
        </h2>
        {extracting && (
          <span className="text-xs text-amber-300">Reading style…</span>
        )}
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
        className={`relative flex min-h-[220px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition ${
          over
            ? "border-amber-400 bg-amber-400/5"
            : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-500"
        } ${extracting ? "cursor-wait opacity-80" : "cursor-pointer"}`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Reference caption frame"
            className="max-h-[360px] w-full object-contain"
          />
        ) : (
          <div className="px-6 py-10 text-center">
            <p className="text-base font-medium text-zinc-100">
              Drop a caption style screenshot
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Font, colour, outline, shadow, position · PNG/JPEG/WebP · max 5MB
            </p>
          </div>
        )}

        {extracting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-400" />
          </div>
        )}
      </button>

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
