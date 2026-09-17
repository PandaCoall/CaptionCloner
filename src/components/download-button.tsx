import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DOWNLOAD_NAME } from "@/lib/export-clip";

type Props = {
  exporting: boolean;
  exportProgress: number;
  downloadUrl: string | null;
  onDownload: () => void;
};

export function DownloadButton({ exporting, exportProgress, downloadUrl, onDownload }: Props) {
  const pct = Math.round(exportProgress * 100);
  return (
    <div className="mt-4 space-y-2">
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={exporting}
        onClick={onDownload}
      >
        <Download className="size-4" />
        {exporting ? `Preparing ${pct}%` : "Download captioned video"}
      </Button>
      {exporting ? (
        <div className="h-1 overflow-hidden rounded-full bg-subtle">
          <div
            className="h-full bg-accent transition-[width] duration-[var(--motion-quick)] ease-[var(--ease-out)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
      {downloadUrl && !exporting ? (
        <a
          href={downloadUrl}
          download={DOWNLOAD_NAME}
          className="block text-center text-sm text-muted hover:text-fg"
        >
          Save again
        </a>
      ) : (
        <p className="text-center text-xs leading-relaxed text-muted">
          Burns the caption look into a WebM you can save.
        </p>
      )}
    </div>
  );
}
