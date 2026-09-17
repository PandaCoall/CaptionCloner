"use client";

import type { TimedWord } from "@/lib/ass";

type Props = {
  text: string;
  words: TimedWord[];
  model?: string;
  loading?: boolean;
  status?: string | null;
  progress?: number;
};

export function TranscriptPanel({ text, words, model, loading, status, progress }: Props) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-400">
          Local Whisper
        </h2>
        {model && <span className="truncate text-[11px] text-zinc-600">{model}</span>}
      </div>

      {loading && (
        <div className="mb-3">
          <p className="text-sm text-amber-300">{status || "Working…"}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-amber-400 transition-all"
              style={{ width: `${Math.max(4, progress || 0)}%` }}
            />
          </div>
        </div>
      )}

      {text ? (
        <p className="text-sm leading-relaxed text-zinc-200">{text}</p>
      ) : (
        !loading && (
          <p className="text-sm text-zinc-500">
            Drop a talking clip, or run the JFK sample. Words stay on this machine.
          </p>
        )
      )}

      {words.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {words.map((w, i) => (
            <span
              key={`${w.start}-${i}`}
              title={`${w.start.toFixed(2)}s – ${w.end.toFixed(2)}s`}
              className="rounded-md bg-zinc-900 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300"
            >
              {w.text}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
