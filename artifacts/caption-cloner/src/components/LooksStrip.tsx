"use client";

import type { Look } from "@/lib/looks";
import { STARTER_LOOKS } from "@/lib/looks";

type Props = {
  activeId?: string;
  onPick: (look: Look) => void;
};

export function LooksStrip({ activeId, onPick }: Props) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">
        Path 1 · starter looks (no vision API)
      </p>
      <div className="flex flex-wrap gap-2">
        {STARTER_LOOKS.map((look) => {
          const on = activeId === look.id;
          return (
            <button
              key={look.id}
              type="button"
              onClick={() => onPick(look)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                on
                  ? "border-amber-400 bg-amber-400/10 text-amber-200"
                  : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-amber-400"
              }`}
            >
              {look.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
