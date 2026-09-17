import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const exec = promisify(execFile);

export async function extractAudio(inputVideo: string, outputMp3: string) {
  await exec("ffmpeg", [
    "-y",
    "-i",
    inputVideo,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-b:a",
    "64k",
    outputMp3,
  ]);
}

export async function burnCaptions(params: {
  inputVideo: string;
  assPath: string;
  fontsDir: string;
  outputVideo: string;
}) {
  const ass = params.assPath.replace(/\\/g, "/").replace(/:/g, "\\:");
  const fonts = params.fontsDir.replace(/\\/g, "/").replace(/:/g, "\\:");
  const filter = `subtitles=${ass}:fontsdir=${fonts}`;

  await exec("ffmpeg", [
    "-y",
    "-i",
    params.inputVideo,
    "-vf",
    filter,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    params.outputVideo,
  ]);
}

export function fontsDir(): string {
  return path.join(process.cwd(), "fonts");
}
