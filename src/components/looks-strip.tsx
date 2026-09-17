import { BUILT_IN_LOOKS, type StyleLook } from "@/lib/schema";
import type { SavedStyle } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Props = {
  activeName?: string;
  saved: SavedStyle[];
  onPick: (look: StyleLook | SavedStyle) => void;
};

export function LooksStrip({ activeName, saved, onPick }: Props) {
  return (
    <section className="rounded-xl bg-elevated p-4 shadow-[var(--shadow-border)]">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted">Looks</h2>
      <div className="flex flex-wrap gap-2">
        {BUILT_IN_LOOKS.map((look) => (
          <LookChip
            key={look.id}
            label={look.name}
            active={activeName === look.name}
            swatches={
              look.style["has-box"]
                ? [look.style["box-color"], look.style["word-box-color"]]
                : [look.style["line-color"], look.style["word-color"]]
            }
            onClick={() => onPick(look)}
          />
        ))}
        {saved.map((entry) => (
          <LookChip
            key={`saved-${entry.name}`}
            label={entry.name}
            active={activeName === entry.name}
            swatches={
              entry.style["has-box"]
                ? [entry.style["box-color"], entry.style["word-box-color"]]
                : [entry.style["line-color"], entry.style["word-color"]]
            }
            onClick={() => onPick(entry)}
          />
        ))}
      </div>
    </section>
  );
}

function LookChip({
  label,
  swatches,
  active,
  onClick,
}: {
  label: string;
  swatches: string[];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm transition-[opacity,transform] duration-[var(--motion-quick)] ease-[var(--ease-out)] active:scale-[0.98]",
        active ? "bg-accent text-accent-fg" : "bg-subtle text-fg shadow-[var(--shadow-border)]",
      )}
    >
      <span className="flex gap-px overflow-hidden rounded-xs">
        {swatches.map((color, i) => (
          <span
            key={`${color}-${i}`}
            className="size-3"
            style={{ backgroundColor: color }}
          />
        ))}
      </span>
      {label}
    </button>
  );
}
