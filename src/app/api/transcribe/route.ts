import { NextRequest, NextResponse } from "next/server";

// ─── Local Whisper (via @xenova/transformers) ──────────────────

let transcriberPromise: Promise<any> | null = null;

function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline, env } = await import("@xenova/transformers");
      env.allowRemoteModels = true;
      env.allowLocalModels = false;

      console.log("[Whisper] Loading multilingual model (whisper-base)...");
      const transcriber = await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-base",
        { quantized: true }
      );
      console.log("[Whisper] Multilingual model loaded!");
      return transcriber;
    })();
  }
  return transcriberPromise;
}

// Map language codes to Whisper language names
const LANGUAGE_MAP: Record<string, string> = {
  en: "english",
  id: "indonesian",
};

// ─── Groq Whisper API ─────────────────────────────────────────

async function transcribeWithGroq(
  audioBuffer: ArrayBuffer,
  langCode: string,
  apiKey: string
): Promise<string> {
  // Convert raw PCM Float32 → WAV for Groq API
  const wavBuffer = pcmToWav(new Float32Array(audioBuffer), 16000);

  const formData = new FormData();
  formData.append("file", new Blob([wavBuffer], { type: "audio/wav" }), "audio.wav");
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("response_format", "json");

  if (langCode !== "auto" && langCode) {
    formData.append("language", langCode);
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const msg = (errData as any)?.error?.message || `Groq API error (${response.status})`;
    throw new Error(msg);
  }

  const data = await response.json();
  return (data.text || "").trim();
}

/** Convert raw PCM Float32 mono audio to WAV format */
function pcmToWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Convert Float32 [-1, 1] to Int16
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ─── GET: Pre-load local model ────────────────────────────────

export async function GET() {
  // Trigger model download/load without blocking
  getTranscriber().catch((err) => {
    console.error("[Whisper] Failed to preload model:", err);
  });

  return NextResponse.json({ status: "preloading" });
}

// ─── POST: Transcribe audio ──────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const langCode = searchParams.get("lang") || "auto";
    const engine = searchParams.get("engine") || "whisper-local";
    const apiKey = searchParams.get("apiKey") || "";

    // Receive raw PCM float32 audio data as binary
    const arrayBuffer = await request.arrayBuffer();

    if (arrayBuffer.byteLength < 16000) {
      return NextResponse.json(
        { error: "Recording too short. Please speak for at least a second." },
        { status: 400 }
      );
    }

    // ─── Groq Whisper ───
    if (engine === "whisper-groq") {
      if (!apiKey) {
        return NextResponse.json(
          { error: "Groq API key is required for cloud transcription. Add it in Settings." },
          { status: 400 }
        );
      }

      const text = await transcribeWithGroq(arrayBuffer, langCode, apiKey);

      if (!text || text === "[BLANK_AUDIO]") {
        return NextResponse.json(
          { error: "No speech detected. Try speaking louder or longer." },
          { status: 400 }
        );
      }

      return NextResponse.json({ text });
    }

    // ─── Local Whisper ───
    const audioData = new Float32Array(arrayBuffer);
    const transcriber = await getTranscriber();

    const options: Record<string, any> = {
      task: "transcribe",
    };

    if (langCode !== "auto" && LANGUAGE_MAP[langCode]) {
      options.language = LANGUAGE_MAP[langCode];
    }

    const result = await transcriber(audioData, options);
    const text = (result?.text || "").trim();

    return NextResponse.json({ text });
  } catch (err) {
    console.error("[Whisper] Transcription error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 500 }
    );
  }
}
