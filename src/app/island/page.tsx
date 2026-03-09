"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWhisperRecognition } from "@/hooks/useWhisperRecognition";
import { getSettings, getProviderLabel, saveSettings, type AIProvider } from "@/lib/settings";
import Waveform from "@/components/Waveform";
import { ConversationManager } from "@/lib/conversation";
import { addEntry } from "@/lib/history";
import { fixPunctuation } from "@/lib/punctuation";
import { playStartSound, playStopSound, playPasteSound } from "@/lib/sounds";
import { trackSession } from "@/lib/stats";
import SettingsPanel from "@/components/SettingsPanel";
import Onboarding from "@/components/Onboarding";
type IslandMode = "dictate" | "transform";

const COMPACT_SIZE = { width: 340, height: 56 };
const EXPANDED_SIZE = { width: 420, height: 580 };

export default function IslandPage() {
  const [targetApp, setTargetApp] = useState("");
  const [statusText, setStatusText] = useState("Ready");
  const [isPasting, setIsPasting] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("talky-onboarding-done");
    }
    return false;
  });

  // Transform mode state
  const [mode, setMode] = useState<IslandMode>("dictate");
  const [selectedText, setSelectedText] = useState("");

  // Audio level for waveform
  const [audioLevel, setAudioLevel] = useState(0);

  // Provider selector state
  const [currentProvider, setCurrentProvider] = useState<AIProvider>(() => getSettings().provider);
  const PROVIDER_ORDER: AIProvider[] = ["groq", "cerebras", "ollama"];
  const SHORT_LABELS: Record<AIProvider, string> = { groq: "Groq", cerebras: "Cerebras", ollama: "Ollama" };

  // Multi-turn conversation context
  const conversationRef = useRef(new ConversationManager());

  // Refs for values accessed inside IPC callback (avoids stale closures)
  const isRecordingRef = useRef(false);
  const isPastingRef = useRef(false);
  const isTransformingRef = useRef(false);
  const modeRef = useRef<IslandMode>("dictate");
  const selectedTextRef = useRef("");

  // Called when Whisper finishes transcription
  const handleTranscriptComplete = useCallback(async (text: string) => {
    if (modeRef.current === "transform" && selectedTextRef.current) {
      // ─── Transform mode: send selected text + voice command to Ollama ───
      setIsTransforming(true);
      isTransformingRef.current = true;
      setStatusText("Transforming...");

      try {
        const s = getSettings();
        const response = await fetch("/api/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: selectedTextRef.current,
            mode: "transform",
            instruction: text,
            provider: s.provider,
            apiKey:
              s.provider === "groq"
                ? s.groqApiKey
                : s.provider === "cerebras"
                  ? s.cerebrasApiKey
                  : undefined,
            ollamaUrl: s.ollamaUrl,
            ollamaModel: s.ollamaModel,
            history: conversationRef.current.getHistory(),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Transform failed");
        }

        const result = (data.result || "").trim();
        if (result) {
          // Store conversation turn for multi-turn context
          conversationRef.current.addTurn(
            `Instruction: ${text}\nText: ${selectedTextRef.current}`,
            result
          );
          // Paste the transformed text back (replaces the selection)
          setIsPasting(true);
          isPastingRef.current = true;
          setStatusText("Replacing...");

          const pasteResult = await window.electronAPI?.pasteToApp(result);
          if (pasteResult?.success) {
            setStatusText(`Updated in ${pasteResult.targetApp}`);
          } else {
            setStatusText("Copied to clipboard");
          }

          // Sound + stats
          if (getSettings().soundEnabled) playPasteSound();
          const wordCount = result.split(/\s+/).filter(Boolean).length;
          trackSession(wordCount, "transform");

          // Auto-save to history
          addEntry({
            text: selectedTextRef.current,
            optimizedText: result,
            mode: "transform",
            appName: pasteResult?.targetApp,
          });

          // Auto-hide
          setTimeout(() => {
            window.electronAPI?.hideIsland();
            resetState();
          }, 800);
        } else {
          setStatusText("No result — try again");
          setIsTransforming(false);
          isTransformingRef.current = false;
        }
      } catch (err: any) {
        setStatusText(err.message || "Transform failed");
        setIsTransforming(false);
        isTransformingRef.current = false;
      }
    } else {
      // ─── Dictate mode: paste transcribed text directly ───
      setIsPasting(true);
      isPastingRef.current = true;
      setStatusText("Pasting...");

      // Post-process transcribed text
      const s = getSettings();
      let processedText = text;
      if (s.autoPunctuation) {
        processedText = fixPunctuation(processedText);
      }

      try {
        const result = await window.electronAPI?.pasteToApp(processedText);
        if (result?.success) {
          setStatusText(`Sent to ${result.targetApp}`);
        } else {
          setStatusText("Copied to clipboard");
        }

        // Sound + stats
        if (s.soundEnabled) playPasteSound();
        const wordCount = processedText.split(/\s+/).filter(Boolean).length;
        trackSession(wordCount, "dictate");

        // Auto-save to history
        addEntry({
          text: processedText,
          mode: "dictate",
          appName: result?.targetApp,
        });
      } catch {
        setStatusText("Copied to clipboard");
        addEntry({ text: processedText, mode: "dictate" });
      }

      // Auto-hide
      setTimeout(() => {
        window.electronAPI?.hideIsland();
        resetState();
      }, 800);
    }
  }, []);

  function resetState() {
    setIsPasting(false);
    isPastingRef.current = false;
    setIsTransforming(false);
    isTransformingRef.current = false;
    setStatusText("Ready");
    setTargetApp("");
    setMode("dictate");
    modeRef.current = "dictate";
    setSelectedText("");
    selectedTextRef.current = "";
  }

  const {
    isListening,
    isProcessing,
    error,
    startListening,
    stopListening,
    cancelListening,
    clearTranscript,
  } = useWhisperRecognition({
    onTranscript: handleTranscriptComplete,
    onAudioLevel: setAudioLevel,
  });

  // Keep recording ref in sync
  useEffect(() => {
    isRecordingRef.current = isListening;
  }, [isListening]);

  // Update status when processing starts
  useEffect(() => {
    if (isProcessing) {
      setStatusText("Transcribing...");
    }
  }, [isProcessing]);

  // Listen for island-toggle events from Electron main process
  useEffect(() => {
    const cleanup = window.electronAPI?.onIslandToggle(
      (appName: string, selText: string) => {
        if (appName) {
          // First toggle: new session — sync provider from settings
          closeSettings();
          setCurrentProvider(getSettings().provider);
          setTargetApp(appName);
          clearTranscript();

          if (selText) {
            // Transform mode — text was selected
            setMode("transform");
            modeRef.current = "transform";
            setSelectedText(selText);
            selectedTextRef.current = selText;

            const preview =
              selText.length > 30
                ? selText.slice(0, 30) + "…"
                : selText;
            setStatusText(`"${preview}"`);
          } else {
            // Dictate mode — no text selected
            setMode("dictate");
            modeRef.current = "dictate";
            setSelectedText("");
            selectedTextRef.current = "";
            setStatusText(`Recording for ${appName}`);
          }

          startListening();
          if (getSettings().soundEnabled) playStartSound();
        } else {
          // Second toggle: stop recording if active, otherwise dismiss
          if (isRecordingRef.current) {
            stopListening();
            if (getSettings().soundEnabled) playStopSound();
            setStatusText("Transcribing...");
          } else if (
            !isPastingRef.current &&
            !isTransformingRef.current
          ) {
            window.electronAPI?.hideIsland();
          }
        }
      }
    );

    return () => {
      cleanup?.();
    };
  }, [startListening, stopListening, clearTranscript]);

  // ESC key to cancel recording and dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (settingsOpen) {
          closeSettings();
          return;
        }
        if (isListening) {
          cancelListening();
        }
        window.electronAPI?.hideIsland();
        resetState();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isListening, cancelListening, settingsOpen]);

  // Expand window on mount if onboarding is shown + sync shortcuts
  useEffect(() => {
    if (showOnboarding) {
      window.electronAPI?.resizeIsland(EXPANDED_SIZE.width, EXPANDED_SIZE.height);
    }
    // Sync saved shortcuts to main process
    const s = getSettings();
    if (s.shortcuts) {
      window.electronAPI?.updateShortcuts?.(s.shortcuts.dictate, s.shortcuts.transform);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent page from going inactive when window is hidden/backgrounded
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // Force keep-alive: override the hidden state so timers/animation frames continue
        Object.defineProperty(document, "hidden", { value: false, configurable: true });
        Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Prevent right-click context menu
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      if (getSettings().soundEnabled) playStopSound();
      setStatusText("Transcribing...");
    } else if (!isProcessing && !isPasting && !isTransforming) {
      clearTranscript();
      startListening();
      if (getSettings().soundEnabled) playStartSound();
      if (mode === "transform") {
        setStatusText("Listening for instruction...");
      } else {
        setStatusText(
          targetApp ? `Recording for ${targetApp}` : "Recording..."
        );
      }
    }
  };

  const handleClose = () => {
    if (isListening) {
      cancelListening();
    }
    closeSettings();
    window.electronAPI?.hideIsland();
    resetState();
  };

  const cycleProvider = () => {
    const idx = PROVIDER_ORDER.indexOf(currentProvider);
    const next = PROVIDER_ORDER[(idx + 1) % PROVIDER_ORDER.length];
    setCurrentProvider(next);
    saveSettings({ provider: next });
  };

  const toggleSettings = () => {
    const next = !settingsOpen;
    setSettingsOpen(next);
    if (next) {
      window.electronAPI?.resizeIsland(EXPANDED_SIZE.width, EXPANDED_SIZE.height);
    } else {
      window.electronAPI?.resizeIsland(COMPACT_SIZE.width, COMPACT_SIZE.height);
    }
  };

  const closeSettings = () => {
    if (settingsOpen) {
      setSettingsOpen(false);
      window.electronAPI?.resizeIsland(COMPACT_SIZE.width, COMPACT_SIZE.height);
    }
  };

  const completeOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem("talky-onboarding-done", "1");
    window.electronAPI?.resizeIsland(COMPACT_SIZE.width, COMPACT_SIZE.height);
  };

  const isBusy = isProcessing || isPasting || isTransforming;

  // Subtitle text
  const getSubtitle = () => {
    if (error) return undefined; // Error shown separately
    if (isListening && mode === "transform") return "Speak: \"improve this\", \"summarize\", \"fix grammar\"...";
    if (isListening) return "\u2325Space or click to stop";
    if (isProcessing) return "Processing with Whisper...";
    if (isTransforming) return `${getProviderLabel(getSettings().provider)} is transforming...`;
    if (isPasting) return "Inserting text...";
    if (mode === "transform") return "Text selected — speak your instruction";
    return "\u2325Space to record";
  };

  return (
    <div
      className="w-full h-screen flex flex-col select-none"
      style={{ background: "transparent" }}
    >
      {/* Compact Bar */}
      <div
        className="w-full flex items-center gap-2 px-2.5 py-1.5 shrink-0"
        style={{
          background: "#000000",
          borderRadius: settingsOpen || showOnboarding ? "16px 16px 0 0" : "32px",
          border: `1px solid ${mode === "transform" ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.1)"}`,
          borderBottom: settingsOpen || showOnboarding ? "none" : undefined,
          boxShadow: settingsOpen || showOnboarding
            ? "none"
            : mode === "transform"
              ? "0 2px 8px rgba(168,85,247,0.08), 0 8px 32px rgba(168,85,247,0.06)"
              : "0 2px 8px rgba(0,0,0,0.2), 0 8px 32px rgba(0,0,0,0.15)",
        }}
      >
        {/* Mic Button */}
        <button
          onClick={handleMicClick}
          disabled={isBusy}
          className={`relative shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
            isBusy
              ? "bg-neutral-700 cursor-not-allowed"
              : isListening
                ? mode === "transform"
                  ? "bg-purple-500 hover:bg-purple-400"
                  : "bg-red-500 hover:bg-red-400"
                : "bg-white hover:bg-neutral-200"
          }`}
        >
          {isListening && (
            <div
              className={`absolute inset-0 rounded-full pulse-ring ${
                mode === "transform" ? "bg-purple-500/30" : "bg-red-500/30"
              }`}
            />
          )}
          {isBusy ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="white"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="white"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : isListening ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="black"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          )}
        </button>

        {/* Status Text / Waveform */}
        <div className="flex-1 min-w-0">
          {isListening ? (
            <Waveform audioLevel={audioLevel} isActive={isListening} compact />
          ) : (
            <>
              <p className="text-[13px] text-white/90 font-medium truncate">
                {error ? "Error" : statusText}
              </p>
              {error ? (
                <p className="text-[10px] text-red-400 truncate">{error}</p>
              ) : (
                <p
                  className={`text-[10px] truncate ${
                    mode === "transform" ? "text-purple-300/60" : "text-white/40"
                  }`}
                >
                  {getSubtitle()}
                </p>
              )}
            </>
          )}
        </div>

        {/* Provider Selector */}
        <button
          onClick={cycleProvider}
          disabled={isBusy || isListening}
          className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-medium transition-all cursor-pointer ${
            isBusy || isListening
              ? "text-white/20 cursor-not-allowed"
              : "text-white/50 hover:text-white hover:bg-white/10"
          }`}
          title="Click to switch AI provider"
        >
          {SHORT_LABELS[currentProvider]}
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Settings gear */}
          <button
            onClick={toggleSettings}
            disabled={isBusy || isListening}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              settingsOpen
                ? "text-white bg-white/15"
                : isBusy || isListening
                  ? "text-white/20 cursor-not-allowed"
                  : "text-white/30 hover:text-white hover:bg-white/10"
            }`}
            title="Settings"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          {/* Close */}
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Dismiss"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Panel (Onboarding or Settings) */}
      {(showOnboarding || settingsOpen) && (
        <div
          className="flex flex-col flex-1 overflow-hidden"
          style={{
            background: "#0a0a0a",
            borderLeft: "1px solid rgba(255,255,255,0.1)",
            borderRight: "1px solid rgba(255,255,255,0.1)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "0 0 16px 16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          }}
        >
          {showOnboarding ? (
            <Onboarding onComplete={completeOnboarding} />
          ) : (
            <SettingsPanel
              isOpen={settingsOpen}
              onClose={closeSettings}
              onProviderChange={(s) => setCurrentProvider(s.provider)}
              inline
            />
          )}
        </div>
      )}
    </div>
  );
}
