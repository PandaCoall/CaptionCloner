"use client";

type Props = {
  rendering: boolean;
  status: string | null;
  videoResultUrl: string | null;
  canRender: boolean;
  onRender: () => void;
  onRetry: () => void;
  canRetry: boolean;
};

export function RenderPanel({
  rendering,
  status,
  videoResultUrl,
  canRender,
  onRender,
  onRetry,
  canRetry,
}: Props) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-zinc-400">
        4 · Burn captions
      </h2>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={rendering || !canRender}
          onClick={onRender}
          className="rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {rendering ? "Rendering…" : "Burn captions onto video"}
        </button>
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 hover:border-zinc-500"
          >
            Retry
          </button>
        )}
        {status && <span className="text-sm text-zinc-400">{status}</span>}
      </div>

      {videoResultUrl && (
        <div className="mt-6 space-y-3">
          <video
            src={videoResultUrl}
            controls
            className="mx-auto max-h-[520px] w-full max-w-[280px] rounded-xl bg-black"
          />
          <a
            href={videoResultUrl}
            download="caption-cloner.mp4"
            className="inline-block text-sm font-medium text-amber-300 hover:text-amber-200"
          >
            Download MP4
          </a>
        </div>
      )}
    </section>
  );
}
