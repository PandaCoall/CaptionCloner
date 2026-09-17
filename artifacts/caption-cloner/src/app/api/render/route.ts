import { randomUUID } from "crypto";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { NextResponse } from "next/server";
import { buildAss } from "@/lib/ass";
import { burnCaptions, extractAudio, fontsDir } from "@/lib/ffmpeg";
import { captionStyleSchema, formatZodErrors } from "@/lib/schema";
import { transcribeAudio } from "@/lib/stt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_VIDEO = 500 * 1024 * 1024;

function errorResponse(status: number, message: string, errors?: string[]) {
  return NextResponse.json(
    errors ? { error: message, errors } : { error: message },
    { status },
  );
}

export async function POST(request: Request) {
  if (!process.env.XAI_API_KEY) {
    return errorResponse(500, "XAI_API_KEY is not set on the server");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(400, "Request must be multipart form-data");
  }

  const styleRaw = form.get("style");
  if (typeof styleRaw !== "string") {
    return errorResponse(400, "Missing style JSON field");
  }

  let styleJson: unknown;
  try {
    styleJson = JSON.parse(styleRaw);
  } catch {
    return errorResponse(400, "style is not valid JSON");
  }

  const styleParsed = captionStyleSchema.safeParse(styleJson);
  if (!styleParsed.success) {
    return errorResponse(400, "Style failed server-side validation", formatZodErrors(styleParsed.error));
  }

  const file = form.get("video");
  const videoUrl = String(form.get("videoUrl") || "").trim();

  if (!(file instanceof File) && !videoUrl) {
    return errorResponse(400, "Upload a dialogue video or provide videoUrl");
  }

  const tmp = await mkdtemp(path.join(os.tmpdir(), "caption-cloner-"));
  const id = randomUUID();

  try {
    const inputPath = path.join(tmp, `input-${id}.mp4`);
    if (file instanceof File) {
      if (file.size > MAX_VIDEO) {
        return errorResponse(413, "Video exceeds 500MB");
      }
      await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    } else {
      const res = await fetch(videoUrl);
      if (!res.ok) {
        return errorResponse(400, `Could not download video URL (HTTP ${res.status})`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > MAX_VIDEO) {
        return errorResponse(413, "Video exceeds 500MB");
      }
      await writeFile(inputPath, buf);
    }

    const audioPath = path.join(tmp, `audio-${id}.mp3`);
    try {
      await extractAudio(inputPath, audioPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResponse(400, `No usable audio track in the video: ${message}`);
    }

    const { words } = await transcribeAudio(audioPath);
    if (words.length === 0) {
      return errorResponse(422, "Grok STT returned no words. The clip may be silent.");
    }

    const assPath = path.join(tmp, `captions-${id}.ass`);
    await writeFile(assPath, buildAss(styleParsed.data, words), "utf8");

    const outputPath = path.join(tmp, `out-${id}.mp4`);
    await burnCaptions({
      inputVideo: inputPath,
      assPath,
      fontsDir: fontsDir(),
      outputVideo: outputPath,
    });

    const mp4 = await readFile(outputPath);
    return new NextResponse(mp4, {
      status: 200,
      headers: {
        "content-type": "video/mp4",
        "content-disposition": 'attachment; filename="caption-cloner.mp4"',
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(502, message);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
