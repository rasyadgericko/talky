"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSettings, type WakeWord } from "@/lib/settings";

/**
 * Maps our wake word names to Porcupine's BuiltInKeyword enum string values.
 */
const PORCUPINE_KEYWORD_MAP: Record<WakeWord, string> = {
  "Alexa": "Alexa",
  "Bumblebee": "Bumblebee",
  "Computer": "Computer",
  "Hey Google": "Hey Google",
  "Hey Siri": "Hey Siri",
  "Jarvis": "Jarvis",
  "Ok Google": "Okay Google",
  "Porcupine": "Porcupine",
  "Terminator": "Terminator",
};

interface UseWakeWordOptions {
  /** Called when the wake word is detected */
  onWakeWord?: () => void;
  /** If true, pause wake word detection (e.g., during active recording) */
  paused?: boolean;
}

/**
 * Hook for wake word detection using Picovoice Porcupine.
 *
 * Requires `@picovoice/porcupine-web` + `@picovoice/web-voice-processor`
 * packages and a Picovoice access key (free at picovoice.ai).
 *
 * The hook starts/stops listening based on settings and the paused flag.
 */
export function useWakeWord(options?: UseWakeWordOptions) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const porcupineRef = useRef<any>(null);
  const onWakeWordRef = useRef(options?.onWakeWord);
  onWakeWordRef.current = options?.onWakeWord;

  const paused = options?.paused ?? false;

  const start = useCallback(async () => {
    const settings = getSettings();
    if (!settings.wakeWordEnabled || !settings.picovoiceAccessKey) {
      return;
    }

    try {
      // Dynamic imports so the app works even without the packages installed
      const { PorcupineWorker, BuiltInKeyword } = await import("@picovoice/porcupine-web");
      const { WebVoiceProcessor } = await import(
        "@picovoice/web-voice-processor"
      );

      const keywordStr = PORCUPINE_KEYWORD_MAP[settings.wakeWord] || "Computer";
      const keyword = keywordStr as unknown as typeof BuiltInKeyword[keyof typeof BuiltInKeyword];

      const porcupine = await PorcupineWorker.create(
        settings.picovoiceAccessKey,
        { builtin: keyword, sensitivity: 0.65 },
        (detection: { label: string }) => {
          console.log(`Wake word detected: ${detection.label}`);
          onWakeWordRef.current?.();
        },
        { publicPath: "/porcupine_params.pv", forceWrite: true }
      );

      // Subscribe the porcupine engine to the microphone audio stream
      await WebVoiceProcessor.subscribe(porcupine);

      porcupineRef.current = { porcupine, WebVoiceProcessor };
      setIsListening(true);
      setError(null);
    } catch (err: any) {
      console.error("Wake word init failed:", err);
      setError(err.message || "Failed to initialize wake word detection");
      setIsListening(false);
    }
  }, []);

  const stop = useCallback(async () => {
    if (porcupineRef.current) {
      const { porcupine, WebVoiceProcessor } = porcupineRef.current;
      try {
        await WebVoiceProcessor.unsubscribe(porcupine);
        porcupine.terminate();
      } catch {
        // Ignore cleanup errors
      }
      porcupineRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Auto-start/stop based on settings and paused state
  useEffect(() => {
    const settings = getSettings();
    if (settings.wakeWordEnabled && settings.picovoiceAccessKey && !paused) {
      start();
    } else {
      stop();
    }

    return () => {
      stop();
    };
  }, [paused, start, stop]);

  return {
    isListening,
    error,
    start,
    stop,
  };
}
