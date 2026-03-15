import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://hveankwjtfvcztcrurlm.supabase.co";

// ─── PCM Float32 → WAV encoder (for direct Groq calls) ────────

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
}

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
    const langCode = searchParams.get("lang") || "en";
    const engine = searchParams.get("engine") || "whisper-local";
    const jwt = searchParams.get("jwt") || "";
    const vocab = searchParams.get("vocab") || "";

    // Receive raw PCM float32 audio data as binary
    const arrayBuffer = await request.arrayBuffer();

    if (arrayBuffer.byteLength < 16000) {
      return NextResponse.json(
        { error: "Recording too short. Please speak for at least a second." },
        { status: 400 }
      );
    }

    // ─── Groq Cloud Transcription ───
    if (engine === "whisper-groq") {
      // Owner mode: call Groq directly with server-side API key
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        const wavBuffer = encodeWav(new Float32Array(arrayBuffer), 16000);
        const formData = new FormData();
        formData.append("file", new Blob([wavBuffer], { type: "audio/wav" }), "audio.wav");
        formData.append("model", "whisper-large-v3-turbo");
        if (langCode && langCode !== "auto") formData.append("language", langCode);
        if (vocab) formData.append("prompt", vocab);

        const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKey}` },
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || `Groq error (${res.status})`);
        return NextResponse.json({ text: data.text });
      }

      // Freemium mode: proxy through Supabase Edge Function
      if (!jwt) {
        return NextResponse.json(
          { error: "Authentication required for cloud transcription." },
          { status: 401 }
        );
      }

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/proxy-transcribe`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/octet-stream",
            "x-language": langCode,
            ...(vocab && { "x-vocabulary": vocab }),
          },
          body: arrayBuffer,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Proxy error (${res.status})`);
      }

      return NextResponse.json({ text: data.text });
    }

    // ─── Free: Local Whisper ───
    // Note: @xenova/transformers does not support the `prompt` parameter
    // for vocabulary hints. Vocabulary only works with Groq cloud.
    const audioData = new Float32Array(arrayBuffer);
    const transcriber = await getTranscriber();

    const options: Record<string, any> = {
      task: "transcribe",
    };

    // Free tier: force English
    if (langCode !== "auto" && LANGUAGE_MAP[langCode]) {
      options.language = LANGUAGE_MAP[langCode];
    } else {
      options.language = "english";
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
