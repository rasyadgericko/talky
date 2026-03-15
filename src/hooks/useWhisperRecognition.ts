"use client";

import { useState, useRef, useCallback } from "react";
import { getSettings } from "@/lib/settings";
import { getSession, getUserTier, isOwnerMode } from "@/lib/auth";
import { buildVocabularyPrompt, applyVocabulary } from "@/lib/vocabulary";

// Silence detection settings
const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION_MS = 2000;
const MIN_SPEECH_DURATION_MS = 800;

function downsampleBuffer(buffer: Float32Array, srcRate: number): Float32Array {
  if (srcRate === 16000) return buffer;
  const ratio = srcRate / 16000;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIdx = Math.round(i * ratio);
    result[i] = buffer[Math.min(srcIdx, buffer.length - 1)];
  }
  return result;
}

async function createPCMRecorder(
  stream: MediaStream,
  onSilence?: () => void,
  onAudioLevel?: (rms: number) => void
) {
  const audioContext = new AudioContext();
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const nativeSampleRate = audioContext.sampleRate;
  console.log(`[Recorder] AudioContext state: ${audioContext.state}, sampleRate: ${nativeSampleRate}`);

  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];

  let silenceStart: number | null = null;
  let hasSpeech = false;
  let speechStart: number | null = null;
  let stopped = false;

  processor.onaudioprocess = (e) => {
    if (stopped) return;
    const input = e.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(input));

    let sum = 0;
    for (let i = 0; i < input.length; i++) {
      sum += input[i] * input[i];
    }
    const rms = Math.sqrt(sum / input.length);
    onAudioLevel?.(rms);

    const now = Date.now();
    if (rms > SILENCE_THRESHOLD) {
      silenceStart = null;
      if (!hasSpeech) {
        hasSpeech = true;
        speechStart = now;
      }
    } else if (hasSpeech) {
      if (silenceStart === null) {
        silenceStart = now;
      } else if (
        now - silenceStart >= SILENCE_DURATION_MS &&
        speechStart !== null &&
        now - speechStart >= MIN_SPEECH_DURATION_MS
      ) {
        stopped = true;
        onSilence?.();
      }
    }
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  return {
    stop: async (): Promise<Float32Array> => {
      stopped = true;
      processor.disconnect();
      source.disconnect();
      await audioContext.close();

      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      return downsampleBuffer(merged, nativeSampleRate);
    },
  };
}

interface UseWhisperOptions {
  onTranscript?: (text: string) => void;
  onAudioLevel?: (rms: number) => void;
}

export function useWhisperRecognition(options?: UseWhisperOptions) {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<{ stop: () => Promise<Float32Array> } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const onTranscriptRef = useRef(options?.onTranscript);
  onTranscriptRef.current = options?.onTranscript;
  const onAudioLevelRef = useRef(options?.onAudioLevel);
  onAudioLevelRef.current = options?.onAudioLevel;

  const startListening = useCallback(async () => {
    try {
      setError(null);
      console.log("[Whisper] Requesting microphone access...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      recorderRef.current = await createPCMRecorder(
        stream,
        () => stopRef.current?.(),
        (rms) => onAudioLevelRef.current?.(rms)
      );

      setIsListening(true);
      setInterimTranscript("Recording... auto-stops on silence");
    } catch (err: any) {
      console.error("[Whisper] Failed to start recording:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Microphone access denied. Open System Settings \u2192 Privacy & Security \u2192 Microphone and enable it for Talky.");
      } else if (err.name === "NotFoundError") {
        setError("No microphone found. Please connect a microphone.");
      } else {
        setError(err.message || "Failed to access microphone");
      }
    }
  }, []);

  const stopListening = useCallback(async () => {
    if (!recorderRef.current) return;

    setIsListening(false);
    setInterimTranscript("");
    setIsProcessing(true);

    try {
      const audioData = await recorderRef.current.stop();
      recorderRef.current = null;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (audioData.length < 8000) {
        setError("Recording too short. Please speak for at least a second.");
        setIsProcessing(false);
        return;
      }

      // Determine engine based on owner mode or tier
      const s = getSettings();
      const session = await getSession();
      let engine = "whisper-local";
      let lang = "en";

      if (isOwnerMode()) {
        // Owner mode: use engine from settings, no auth needed
        engine = s.engine === "groq" ? "whisper-groq" : "whisper-local";
        lang = s.language || "auto";
      } else if (session) {
        const userTier = await getUserTier();
        if (userTier === "pro") {
          engine = "whisper-groq";
          lang = s.language || "auto";
        }
      }

      const params = new URLSearchParams({ lang, engine });
      if (!isOwnerMode() && engine === "whisper-groq" && session) {
        params.set("jwt", session.access_token);
      }
      const vocabPrompt = buildVocabularyPrompt();
      if (vocabPrompt) {
        params.set("vocab", vocabPrompt);
      }

      setInterimTranscript(
        engine === "whisper-groq" ? "Transcribing via Groq..." : "Transcribing..."
      );

      const response = await fetch(`/api/transcribe?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: audioData as unknown as BodyInit,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transcription failed");
      }

      const rawText = (data.text || "").trim();
      const newText = applyVocabulary(rawText);
      if (newText && newText !== "[BLANK_AUDIO]") {
        setTranscript((prev) => (prev ? `${prev} ${newText}` : newText));
        onTranscriptRef.current?.(newText);
      } else {
        setError("No speech detected. Try speaking louder or longer.");
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
      setError(`Transcription failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setInterimTranscript("");
    }
  }, []);

  stopRef.current = stopListening;

  const cancelListening = useCallback(async () => {
    if (recorderRef.current) {
      await recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsListening(false);
    setIsProcessing(false);
    setInterimTranscript("");
    setError(null);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    isProcessing,
    isSupported:
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia,
    error,
    startListening,
    stopListening,
    cancelListening,
    clearTranscript,
    setTranscript,
  };
}
