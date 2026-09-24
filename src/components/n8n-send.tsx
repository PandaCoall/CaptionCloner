import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "caption-cloner-n8n-webhook";

type Props = {
  busy: boolean;
  onSend: (webhook: string) => Promise<string>;
};

export function N8nSend({ busy, onSend }: Props) {
  const [webhook, setWebhook] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    try {
      setWebhook(localStorage.getItem(STORAGE_KEY) || "");
    } catch {
      // ignore
    }
  }, []);

  function save(next: string) {
    setWebhook(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-4 space-y-2 rounded-xl bg-elevated p-4 shadow-[var(--shadow-border)]">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">n8n</p>
      <label className="block text-xs font-medium uppercase tracking-wider text-muted">
        Webhook URL
        <Input
          value={webhook}
          onChange={(e) => save(e.target.value)}
          placeholder="https://your-n8n.app/webhook/captions"
          className="mt-1"
          spellCheck={false}
        />
      </label>
      <Button
        type="button"
        className="w-full"
        disabled={busy || !webhook.trim()}
        onClick={() => {
          setNote(null);
          setFailed(false);
          void onSend(webhook.trim())
            .then((message) => {
              setFailed(false);
              setNote(message);
            })
            .catch((err: unknown) => {
              setFailed(true);
              setNote(err instanceof Error ? err.message : "n8n did not accept the video");
            });
        }}
      >
        <Send className="size-4" />
        {busy ? "Sending…" : "Generate to n8n"}
      </Button>
      <p className={failed ? "text-xs leading-relaxed text-danger" : "text-xs leading-relaxed text-muted"}>
        {note ||
          "Sends the captioned WebM to your n8n webhook as file. In n8n, save that binary into the folder you want."}
      </p>
    </div>
  );
}
