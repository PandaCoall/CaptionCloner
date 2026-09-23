import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CAPTION_FONTS, type CaptionStyle } from "@/lib/schema";
import type { SavedStyle } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = {
  style: CaptionStyle;
  caption: string;
  highlight: string;
  saved: SavedStyle[];
  onChange: (next: CaptionStyle) => void;
  onCaptionChange: (next: string) => void;
  onHighlightChange: (next: string) => void;
  onSave: (name: string) => void;
  onLoad: (entry: SavedStyle) => void;
  onDelete: (name: string) => void;
};

export function StylePanel({
  style,
  caption,
  highlight,
  saved,
  onChange,
  onCaptionChange,
  onHighlightChange,
  onSave,
  onLoad,
  onDelete,
}: Props) {
  const [name, setName] = useState("");
  const boxed = style["has-box"];

  function patch<K extends keyof CaptionStyle>(key: K, value: CaptionStyle[K]) {
    onChange({ ...style, [key]: value });
  }

  function setBoxed(next: boolean) {
    onChange({
      ...style,
      "has-box": next,
      "outline-width": next ? 0 : style["outline-width"] || 6,
      "shadow-offset": next ? 0 : style["shadow-offset"] || 4,
    });
  }

  return (
    <section className="rounded-xl bg-elevated p-4 shadow-[var(--shadow-border)]">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted">2 · Type</h2>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Treatment</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBoxed(false)}
              className={cn(
                "h-11 rounded-md px-3 text-sm",
                !boxed ? "bg-accent text-accent-fg" : "bg-subtle text-fg shadow-[var(--shadow-border)]",
              )}
            >
              Outline
            </button>
            <button
              type="button"
              onClick={() => setBoxed(true)}
              className={cn(
                "h-11 rounded-md px-3 text-sm",
                boxed ? "bg-accent text-accent-fg" : "bg-subtle text-fg shadow-[var(--shadow-border)]",
              )}
            >
              Box
            </button>
          </div>
        </div>

        <label className="block text-xs font-medium uppercase tracking-wider text-muted">
          Cloned caption
          <textarea
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md bg-subtle px-3 py-2 text-sm text-fg shadow-[var(--shadow-border)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <p className="text-xs leading-relaxed text-muted">
          Two words per line, unless a word is 11+ letters — those keep their own line so nothing clips.
        </p>
        <label className="block text-xs font-medium uppercase tracking-wider text-muted">
          Highlight word
          <Input value={highlight} onChange={(e) => onHighlightChange(e.target.value)} className="mt-1" />
        </label>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Font</p>
          <div className="flex flex-wrap gap-2">
            {CAPTION_FONTS.map((font) => (
              <button
                key={font}
                type="button"
                onClick={() => patch("font-family", font)}
                style={{ fontFamily: `"${font}", sans-serif` }}
                className={cn(
                  "h-11 rounded-md px-3 text-sm transition-[opacity,transform] duration-[var(--motion-quick)] ease-[var(--ease-out)] active:scale-[0.98]",
                  style["font-family"] === font
                    ? "bg-accent text-accent-fg"
                    : "bg-subtle text-fg shadow-[var(--shadow-border)]",
                )}
              >
                {font}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => patch("italic", !style.italic)}
              className={cn(
                "h-11 rounded-md px-3 text-sm",
                style.italic ? "bg-accent text-accent-fg" : "bg-subtle text-fg shadow-[var(--shadow-border)]",
              )}
            >
              Italic
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ColorField
            label="Line"
            value={style["line-color"]}
            onChange={(v) => patch("line-color", v)}
          />
          <ColorField
            label="Highlight"
            value={style["word-color"]}
            onChange={(v) => patch("word-color", v)}
          />
          {boxed ? (
            <>
              <ColorField
                label="Box"
                value={style["box-color"]}
                onChange={(v) => patch("box-color", v)}
              />
              <ColorField
                label="Highlight box"
                value={style["word-box-color"]}
                onChange={(v) => patch("word-box-color", v)}
              />
            </>
          ) : (
            <>
              <ColorField
                label="Outline"
                value={style["outline-color"]}
                onChange={(v) => patch("outline-color", v)}
              />
              <ColorField
                label="Shadow"
                value={style["shadow-color"]}
                onChange={(v) => patch("shadow-color", v)}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Size"
            value={style["font-size"]}
            min={18}
            max={160}
            onChange={(n) => patch("font-size", n)}
          />
          <NumberField
            label="Words / line"
            value={style["max-words-per-line"]}
            min={1}
            max={8}
            step={1}
            onChange={(n) => patch("max-words-per-line", n)}
          />
          {boxed ? (
            <>
              <NumberField
                label="Box radius"
                value={style["box-radius"]}
                min={0}
                max={40}
                onChange={(n) => patch("box-radius", n)}
              />
              <NumberField
                label="Box gap"
                value={style["box-gap"]}
                min={0}
                max={40}
                onChange={(n) => patch("box-gap", n)}
              />
              <NumberField
                label="Pad X"
                value={style["box-pad-x"]}
                min={4}
                max={80}
                onChange={(n) => patch("box-pad-x", n)}
              />
              <NumberField
                label="Pad Y"
                value={style["box-pad-y"]}
                min={2}
                max={48}
                onChange={(n) => patch("box-pad-y", n)}
              />
            </>
          ) : (
            <>
              <NumberField
                label="Outline"
                value={style["outline-width"]}
                min={0}
                max={24}
                onChange={(n) => patch("outline-width", n)}
              />
              <NumberField
                label="Shadow"
                value={style["shadow-offset"]}
                min={0}
                max={24}
                onChange={(n) => patch("shadow-offset", n)}
              />
            </>
          )}
        </div>

        <label className="block text-xs font-medium uppercase tracking-wider text-muted">
          Vertical position
          <input
            type="range"
            min={80}
            max={1760}
            value={style.y}
            onChange={(e) => patch("y", Number(e.target.value))}
            className="mt-2 w-full accent-[var(--color-accent)]"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this style"
            className="min-w-40 flex-1"
          />
          <Button
            type="button"
            onClick={() => {
              if (!name.trim()) return;
              onSave(name.trim());
              setName("");
            }}
          >
            Save style
          </Button>
        </div>

        {saved.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {saved.map((entry) => (
              <span
                key={entry.name}
                className="inline-flex items-center gap-1 rounded-full bg-subtle pl-3 pr-1 text-sm text-fg shadow-[var(--shadow-border)]"
              >
                <button type="button" onClick={() => onLoad(entry)} className="py-2">
                  {entry.name}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(entry.name)}
                  className="rounded-full px-2 py-2 text-muted hover:text-fg"
                  aria-label={`Delete ${entry.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-medium uppercase tracking-wider text-muted">
      {label}
      <span className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-11 w-11 shrink-0 cursor-pointer rounded-md bg-transparent"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
      </span>
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block text-xs font-medium uppercase tracking-wider text-muted">
      {label}
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        className="mt-1"
        onChange={(e) => {
          const n = step === 1 ? parseInt(e.target.value, 10) : Number(e.target.value);
          if (Number.isNaN(n)) return;
          onChange(Math.max(min, Math.min(max, n)));
        }}
      />
    </label>
  );
}
