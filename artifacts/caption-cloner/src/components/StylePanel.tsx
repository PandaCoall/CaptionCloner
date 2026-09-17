"use client";

import { useState } from "react";
import type { CaptionStyle } from "@/lib/schema";
import { CaptionPreview } from "./CaptionPreview";
import type { SavedStyle } from "@/lib/storage";

type Props = {
  style: CaptionStyle;
  background: string;
  caption: string;
  highlight: string;
  saved: SavedStyle[];
  onChange: (next: CaptionStyle) => void;
  onBackgroundChange: (next: string) => void;
  onCaptionChange: (next: string) => void;
  onHighlightChange: (next: string) => void;
  onSave: (name: string) => void;
  onLoad: (entry: SavedStyle) => void;
  onDelete: (name: string) => void;
};

const COLOR_FIELDS = [
  "line-color",
  "word-color",
  "outline-color",
  "shadow-color",
] as const;

const NUMBER_FIELDS: { key: keyof CaptionStyle; label: string; step?: number; min?: number; max?: number }[] = [
  { key: "font-size", label: "Font size", min: 8 },
  { key: "outline-width", label: "Outline width", min: 0 },
  { key: "shadow-offset", label: "Shadow offset", min: 0 },
  { key: "max-words-per-line", label: "Max words / line", min: 1, step: 1 },
  { key: "y", label: "Y (from top)", min: 0, max: 1920 },
];

export function StylePanel({
  style,
  background,
  caption,
  highlight,
  saved,
  onChange,
  onBackgroundChange,
  onCaptionChange,
  onHighlightChange,
  onSave,
  onLoad,
  onDelete,
}: Props) {
  const [name, setName] = useState("");

  function patch<K extends keyof CaptionStyle>(key: K, value: CaptionStyle[K]) {
    onChange({ ...style, [key]: value });
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-zinc-400">
        2 · Style
      </h2>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <label className="block text-xs uppercase tracking-wider text-zinc-500">
            Cloned caption
            <textarea
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
            />
          </label>

          <label className="block text-xs uppercase tracking-wider text-zinc-500">
            Highlight word
            <input
              value={highlight}
              onChange={(e) => onHighlightChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
            />
          </label>

          <label className="block text-xs uppercase tracking-wider text-zinc-500">
            Font family
            <input
              value={style["font-family"]}
              onChange={(e) => patch("font-family", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            {COLOR_FIELDS.map((key) => (
              <label key={key} className="block text-xs uppercase tracking-wider text-zinc-500">
                {key}
                <span className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={style[key]}
                    onChange={(e) => patch(key, e.target.value.toUpperCase())}
                    className="h-9 w-12 cursor-pointer rounded border border-zinc-700 bg-transparent"
                  />
                  <input
                    value={style[key]}
                    onChange={(e) => patch(key, e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-amber-400"
                  />
                </span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {NUMBER_FIELDS.map((field) => (
              <label key={field.key} className="block text-xs uppercase tracking-wider text-zinc-500">
                {field.label}
                <input
                  type="number"
                  value={style[field.key] as number}
                  min={field.min}
                  max={field.max}
                  step={field.step ?? 1}
                  onChange={(e) => {
                    const n = field.step === 1 ? parseInt(e.target.value, 10) : Number(e.target.value);
                    if (Number.isNaN(n)) return;
                    patch(field.key, n as CaptionStyle[typeof field.key]);
                  }}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
                />
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs uppercase tracking-wider text-zinc-500">
              Position
              <input
                value={style.position}
                readOnly
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-400"
              />
            </label>
            <label className="block text-xs uppercase tracking-wider text-zinc-500">
              X
              <input
                type="number"
                value={style.x}
                readOnly
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-400"
              />
            </label>
          </div>

          <label className="block text-xs uppercase tracking-wider text-zinc-500">
            Background gradient
            <input
              value={background}
              onChange={(e) => onBackgroundChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100 outline-none focus:border-amber-400"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Style name"
              className="min-w-[160px] flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={() => {
                if (!name.trim()) return;
                onSave(name.trim());
                setName("");
              }}
              className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300"
            >
              Save style
            </button>
          </div>

          {saved.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {saved.map((entry) => (
                <span
                  key={entry.name}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 pl-3 pr-1 text-sm text-zinc-200"
                >
                  <button type="button" onClick={() => onLoad(entry)} className="py-1">
                    {entry.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(entry.name)}
                    className="rounded-full px-2 py-1 text-zinc-500 hover:text-red-400"
                    aria-label={`Delete ${entry.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <CaptionPreview
          style={style}
          background={background}
          caption={caption}
          highlight={highlight}
        />
      </div>
    </section>
  );
}
