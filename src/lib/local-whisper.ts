import type { TimedWord } from "./transcribe";

export type LocalTranscript = {
  text: string;
  words: TimedWord[];
  model: string;
};

export type WhisperProgress = (message: string, ratio: number) => void;

const MODEL_ID = "Xenova/whisper-tiny.en";

type AsrPipeline = (
  audio: Float32Array | string,
  options?: {
    language?: string;
    task?: string;
    return_timestamps?: boolean | "word";
    chunk_length_s?: number;
  },
) => Promise<{
  text?: string;
  chunks?: { text?: string; timestamp?: [number, number] | number[] }[];
}>;

let pipelinePromise: Promise<AsrPipeline> | null = null;

function chunksToWords(
  chunks: Array<{ text?: string; timestamp?: [number, number] | number[] }>,
): TimedWord[] {
  return chunks
    .map((chunk) => {
      const text = String(chunk.text || "").trim().replace(/[.,!?]+$/g, "");
      const start = Array.isArray(chunk.timestamp) ? Number(chunk.timestamp[0]) || 0 : 0;
      const rawEnd = Array.isArray(chunk.timestamp) ? Number(chunk.timestamp[1]) : NaN;
      const end = Number.isFinite(rawEnd) && rawEnd >= start ? rawEnd : start + 0.2;
      return { text, start, end };
    })
    .filter((w) => w.text);
}

async function getPipeline(onProgress?: WhisperProgress): Promise<AsrPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      onProgress?.("Loading Whisper in this browser…", 0.04);
      const { pipeline, env } = await import("@huggingface/transformers");
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      const asr = await pipeline("automatic-speech-recognition", MODEL_ID, {
        dtype: "q8",
        device: "wasm",
        progress_callback: (status: {
          status?: string;
          progress?: number;
          file?: string;
        }) => {
          if (status.status === "progress" && typeof status.progress === "number") {
            const ratio = Math.min(0.82, 0.05 + (status.progress / 100) * 0.75);
            onProgress?.(`Downloading ${status.file || "Whisper tiny.en"}…`, ratio);
          } else if (status.status === "ready") {
            onProgress?.("Whisper is ready", 0.84);
          }
        },
      });
      return asr as unknown as AsrPipeline;
    })().catch((err) => {
      pipelinePromise = null;
      throw err;
    });
  }
  return pipelinePromise;
}

export async function transcribePcm(
  samples: Float32Array,
  onProgress?: WhisperProgress,
): Promise<LocalTranscript> {
  if (typeof window === "undefined") {
    throw new Error("Whisper runs in the browser");
  }
  const asr = await getPipeline(onProgress);
  onProgress?.("Listening for speech…", 0.88);
  const output = await asr(samples, {
    return_timestamps: "word",
    chunk_length_s: 30,
  });
  const chunks = Array.isArray(output.chunks) ? output.chunks : [];
  const words = chunksToWords(chunks);
  const text = String(output.text || words.map((w) => w.text).join(" ")).trim();
  if (!words.length && !text) {
    throw new Error("No speech found in this clip.");
  }
  onProgress?.("Done", 1);
  return {
    text,
    words: words.length ? words : [{ text, start: 0, end: 2 }],
    model: MODEL_ID,
  };
}

export const WHISPER_MODEL_LABEL = "Whisper tiny.en · on this device";
