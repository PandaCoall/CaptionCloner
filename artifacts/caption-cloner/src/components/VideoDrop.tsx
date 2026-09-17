"use client";

import { useRef, useState } from "react";

type Props = {
  localUrl: string | null;
  remoteUrl: string;
  uploading: boolean;
  onFile: (file: File) => void;
  onUrl: (url: string) => void;
};

export function VideoDrop({ localUrl, remoteUrl, uploading, onFile, onUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-400">
          3 · Dialogue video
        </h2>
        {uploading && <span className="text-xs text-amber-300">Uploading…</span>}
      </div>
      <p className="mb-3 text-sm text-zinc-500">
        This clip supplies the spoken line. Captions are transcribed from its
        audio and timed to the speech, then burned in with the cloned style.
      </p>

      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files[0];
          if (file) onFile(file);
        }}
        className={`relative flex min-h-[200px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition ${
          over
            ? "border-amber-400 bg-amber-400/5"
            : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-500"
        } ${uploading ? "cursor-wait opacity-80" : "cursor-pointer"}`}
      >
        {localUrl ? (
          <video src={localUrl} controls className="max-h-[360px] w-full object-contain" />
        ) : (
          <div className="px-6 py-10 text-center">
            <p className="text-base font-medium text-zinc-100">Drop the talking video</p>
            <p className="mt-1 text-sm text-zinc-500">MP4, MOV or WebM · max 500MB</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-400" />
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />

      <label className="mt-3 block text-xs uppercase tracking-wider text-zinc-500">
        Or public video URL
        <input
          value={remoteUrl}
          onChange={(e) => onUrl(e.target.value)}
          placeholder="https://…/dialogue.mp4"
          className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100 outline-none focus:border-amber-400"
        />
      </label>
    </section>
  );
}
