"use client";

import { useState, useRef, useCallback } from "react";
import { getSettings } from "@/lib/settings";

// Silence detection settings
const SILENCE_THRESHOLD = 0.01; // RMS level below this = silence
const SILENCE_DURATION_MS = 2000; // 2 seconds of silence to auto-stop
const MIN_SPEECH_DURATION_MS = 800; // Must have at least 0.8s of speech before auto-stop activates

/**
 * Downsample audio from source sample rate to 16 kHz mono.
 */
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

/**
 * Captures raw 16kHz mono PCM audio from the microphone using AudioContext.
 * Uses the system's native sample rate and downsamples to 16kHz for Whisper.
 * Monitors audio levels and calls onSilence() when silence is detected.
 */
async function createPCMRecorder(
  stream: MediaStream,
  onSilence?: () => void,
  onAudioLevel?: (rms: number) => void
) {
  // Use the default sample rate (system native) for best compatibility
  const audioContext = new AudioContext();

  // Ensure AudioContext is running (can be suspended due to autoplay policy)
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

    // Calculate RMS (root mean square) for silence detection
    let sum = 0;
    for (let i = 0; i < input.length; i++) {
      sum += input[i] * input[i];
    }
    const rms = Math.sqrt(sum / input.length);
    onAudioLevel?.(rms);

    const now = Date.now();

    if (rms > SILENCE_THRESHOLD) {
      // Sound detected
      silenceStart = null;
      if (!hasSpeech) {
        hasSpeech = true;
        speechStart = now;
      }
    } else if (hasSpeech) {
      // Silence after speech — start or continue silence timer
      if (silenceStart === null) {
        silenceStart = now;
      } else if (
        now - silenceStart >= SILENCE_DURATION_MS &&
        speechStart !== null &&
        now - speechStart >= MIN_SPEECH_DURATION_MS
      ) {
        // Enough silence after sufficient speech — auto-stop
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

      // Merge all chunks
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      // Downsample to 16kHz for Whisper
      return downsampleBuffer(merged, nativeSampleRate);
    },
  };
}

interface UseWhisperOptions {
  /** Called with the new transcribed text when transcription succeeds */
  onTranscript?: (text: string) => void;
  /** Called with RMS audio level (0-1) on each audio frame during recording */
  onAudioLevel?: (rms: number) => void;
}

export function useWhisperRecognition(options?: UseWhisperOptions) {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<{ stop: () => Promise<Float32Array> } | null>(
    null
  );
  const streamRef = useRef<MediaStream | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  // Use refs for callbacks to avoid stale closures in memoized functions
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
      console.log("[Whisper] Microphone stream acquired, tracks:", stream.getAudioTracks().length);

      streamRef.current = stream;
      recorderRef.current = await createPCMRecorder(
        stream,
        () => {
          // Auto-stop on silence — call stopListening via ref to avoid stale closure
          stopRef.current?.();
        },
        (rms) => {
          onAudioLevelRef.current?.(rms);
        }
      );

      setIsListening(true);
      setInterimTranscript("Recording... auto-stops on silence");
      console.log("[Whisper] Recording started");
    } catch (err: any) {
      console.error("[Whisper] Failed to start recording:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Microphone access denied. Open System Settings → Privacy & Security → Microphone and enable it for Talky.");
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
      // Get raw PCM audio
      const audioData = await recorderRef.current.stop();
      recorderRef.current = null;

      // Stop mic stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (audioData.length < 8000) {
        setError("Recording too short. Please speak for at least a second.");
        setIsProcessing(false);
        return;
      }

      // Build transcription URL with settings
      const s = getSettings();
      const lang = s.language || "auto";
      const engine = s.speechEngine || "whisper-local";
      const params = new URLSearchParams({ lang, engine });

      // Pass Groq API key if using cloud transcription
      if (engine === "whisper-groq" && s.groqApiKey) {
        params.set("apiKey", s.groqApiKey);
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

      const newText = (data.text || "").trim();
      if (newText && newText !== "[BLANK_AUDIO]") {
        setTranscript((prev) => (prev ? `${prev} ${newText}` : newText));
        // Notify listener with the newly transcribed text
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

  // Keep ref in sync so silence callback can call stopListening
  stopRef.current = stopListening;

  /** Stop recording and discard audio without transcribing */
  const cancelListening = useCallback(async () => {
    if (recorderRef.current) {
      await recorderRef.current.stop(); // Clean up AudioContext
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
