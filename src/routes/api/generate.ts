import { createFileRoute } from "@tanstack/react-router";

function webhookUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const target = webhookUrl(String(form.get("webhook") || ""));
        const file = form.get("file");
        if (!target) {
          return Response.json(
            { ok: false, error: "Paste the n8n production webhook URL (http or https)." },
            { status: 400 },
          );
        }
        if (!(file instanceof File) || file.size === 0) {
          return Response.json({ ok: false, error: "Missing captioned video." }, { status: 400 });
        }
        if (file.size > 80 * 1024 * 1024) {
          return Response.json({ ok: false, error: "Video is over 80 MB." }, { status: 413 });
        }

        const forward = new FormData();
        const filename = file.name || "caption-cloner.webm";
        forward.append("file", file, filename);
        forward.append("filename", filename);
        forward.append("caption", String(form.get("caption") || ""));
        forward.append("highlight", String(form.get("highlight") || ""));
        forward.append("animation", String(form.get("animation") || "none"));
        forward.append("look", String(form.get("look") || ""));

        let res: Response;
        try {
          res = await fetch(target, { method: "POST", body: forward });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Could not reach n8n";
          return Response.json({ ok: false, error: message }, { status: 502 });
        }

        const body = (await res.text()).slice(0, 800);
        return Response.json(
          { ok: res.ok, status: res.status, n8n: body },
          { status: res.ok ? 200 : 502 },
        );
      },
    },
  },
});
