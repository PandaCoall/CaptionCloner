import type { TimedWord } from "./ass";

export type LocalTranscript = {
  text: string;
  words: TimedWord[];
  model: string;
};

type ProgressFn = (message: string, pct?: number) => void;

let transcriberPromise: Promise<any> | null = null;

const MODEL_ID = "Xenova/whisper-tiny.en";
const SAMPLE_URL =
  "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav";

async function getTranscriber(onProgress?: ProgressFn) {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      onProgress?.("Loading Whisper tiny.en in this browser…", 5);
      const { pipeline, env } = await import("@huggingface/transformers");
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      return pipeline("automatic-speech-recognition", MODEL_ID, {
        dtype: "q8",
        progress_callback: (status: {
          status?: string;
          progress?: number;
          file?: string;
        }) => {
          if (status.status === "progress" && typeof status.progress === "number") {
            onProgress?.(
              `Downloading ${status.file || "model"}…`,
              Math.min(90, Math.round(status.progress)),
            );
          }
        },
      });
    })();
  }
  return transcriberPromise;
}

function chunksToWords(
  chunks: Array<{ text?: string; timestamp?: [number, number] | number[] }>,
): TimedWord[] {
  return chunks
    .map((chunk) => {
      const text = String(chunk.text || "").trim();
      const start = Array.isArray(chunk.timestamp) ? Number(chunk.timestamp[0]) || 0 : 0;
      const end = Array.isArray(chunk.timestamp) ? Number(chunk.timestamp[1]) || start : start;
      return { text, start, end: end >= start ? end : start };
    })
    .filter((w) => w.text);
}

export async function transcribeLocalAudio(
  audio: string | Float32Array | ArrayBuffer | Blob,
  onProgress?: ProgressFn,
): Promise<LocalTranscript> {
  const asr = await getTranscriber(onProgress);
  onProgress?.("Transcribing locally…", 92);

  let input: string | Float32Array | string = audio as string;
  if (audio instanceof Blob) {
    input = URL.createObjectURL(audio);
  } else if (audio instanceof ArrayBuffer) {
    input = new Float32Array(audio);
  } else {
    input = audio as string | Float32Array;
  }

  const output = await asr(input, {
    language: "english",
    task: "transcribe",
    return_timestamps: "word",
    chunk_length_s: 30,
  });

  if (audio instanceof Blob && typeof input === "string" && input.startsWith("blob:")) {
    URL.revokeObjectURL(input);
  }

  const chunks = Array.isArray(output?.chunks) ? output.chunks : [];
  const words = chunksToWords(chunks);
  const text = String(output?.text || words.map((w) => w.text).join(" ")).trim();

  if (!words.length && text) {
    return {
      text,
      words: [{ text, start: 0, end: 2 }],
      model: MODEL_ID,
    };
  }

  onProgress?.("Done", 100);
  return { text, words, model: MODEL_ID };
}

export async function transcribeSample(onProgress?: ProgressFn): Promise<LocalTranscript> {
  onProgress?.("Fetching sample speech (JFK)…", 2);
  return transcribeLocalAudio(SAMPLE_URL, onProgress);
}

export function decodeVideoToWavBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audioCtx = new AudioContext();
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    const cleanup = () => {
      URL.revokeObjectURL(url);
      void audioCtx.close();
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read video audio"));
    };

    video.onloadedmetadata = async () => {
      try {
        const duration = Math.min(video.duration || 30, 90);
        const offline = new OfflineAudioContext(1, Math.ceil(16000 * duration), 16000);
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(buf.slice(0));
        const source = offline.createBufferSource();
        source.buffer = decoded;
        source.connect(offline.destination);
        source.start(0);
        const rendered = await offline.startRendering();
        const pcm = rendered.getChannelData(0);
        resolve(encodeWav(pcm, 16000));
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Audio decode failed"));
      } finally {
        cleanup();
      }
    };
  });
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}
