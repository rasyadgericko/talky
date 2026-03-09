"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useWhisperRecognition } from "@/hooks/useWhisperRecognition";
import SettingsPanel from "@/components/SettingsPanel";
import Waveform from "@/components/Waveform";
import { type ProviderSettings, type AIProvider, getSettings, getProviderLabel, getSpeechEngineLabel, saveSettings } from "@/lib/settings";
import { ConversationManager } from "@/lib/conversation";
import HistoryPanel from "@/components/HistoryPanel";
import UpdateNotification from "@/components/UpdateNotification";
import { addEntry } from "@/lib/history";


type Mode = "optimize" | "refine" | "summarize";

const MODE_CONFIG: Record<Mode, { label: string; description: string }> = {
  optimize: {
    label: "Optimize Prompt",
    description: "Transform speech into a well-structured AI prompt",
  },
  refine: {
    label: "Refine Text",
    description: "Polish into professional prose",
  },
  summarize: {
    label: "Summarize",
    description: "Extract key points as bullet points",
  },
};

export default function Home() {
  const [audioLevel, setAudioLevel] = useState(0);
  const conversationRef = useRef(new ConversationManager());

  const {
    transcript,
    interimTranscript,
    isListening,
    isProcessing,
    isSupported,
    error: speechError,
    startListening,
    stopListening,
    clearTranscript,
    setTranscript,
  } = useWhisperRecognition({ onAudioLevel: setAudioLevel });

  const [optimizedText, setOptimizedText] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [mode, setMode] = useState<Mode>("optimize");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"transcript" | "optimized" | null>(
    null
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [providerSettings, setProviderSettings] =
    useState<ProviderSettings>(getSettings);

  const handleProviderChange = useCallback((s: ProviderSettings) => {
    setProviderSettings(s);
  }, []);

  const handleProviderSelect = (provider: AIProvider) => {
    const updated = saveSettings({ provider });
    setProviderSettings(updated);
  };

  // ESC key to cancel recording
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isListening) {
        e.preventDefault();
        stopListening();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isListening, stopListening]);

  const handleOptimize = async () => {
    const text = transcript.trim();
    if (!text) return;

    setIsOptimizing(true);
    setError(null);
    setOptimizedText("");

    // Read latest settings
    const s = getSettings();

    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          mode,
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
        throw new Error(data.error || "Failed to optimize");
      }

      setOptimizedText(data.result);
      // Store this exchange for multi-turn context
      conversationRef.current.addTurn(text, data.result);
      // Auto-save to history
      addEntry({ text, optimizedText: data.result, mode });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCopy = async (
    text: string,
    type: "transcript" | "optimized"
  ) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleClear = () => {
    clearTranscript();
    setOptimizedText("");
    setError(null);
    conversationRef.current.clear();
  };

  if (!isSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-card border border-card-border rounded-2xl p-8 max-w-md text-center">
          <div className="text-4xl mb-4">🎙️</div>
          <h2 className="text-xl font-semibold mb-2">
            Browser Not Supported
          </h2>
          <p className="text-muted">
            Speech recognition is not supported in your browser. Please use
            Chrome, Edge, or Safari.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header — draggable title bar with space for macOS traffic lights */}
      <header className="border-b border-card-border pl-20 pr-6 py-4 drag-region">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold font-[family-name:var(--font-geist-sans)] leading-tight">
                Talky
              </h1>
              <p className="text-[10px] text-muted font-medium tracking-wider uppercase leading-tight">
                Build by RYC
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setHistoryOpen(true)}
              className="no-drag w-8 h-8 rounded-lg flex items-center justify-center hover:bg-card-border/30 transition-colors cursor-pointer text-muted hover:text-foreground"
              title="History"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M12 7v5l4 2" />
              </svg>
            </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="no-drag w-8 h-8 rounded-lg flex items-center justify-center hover:bg-card-border/30 transition-colors cursor-pointer text-muted hover:text-foreground"
            title="Settings"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Mic Button */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {isListening && (
                <div className="absolute inset-0 bg-white/20 rounded-full pulse-ring" />
              )}
              {isProcessing && (
                <div className="absolute inset-0 bg-white/10 rounded-full animate-pulse" />
              )}
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  isProcessing
                    ? "bg-neutral-700 cursor-not-allowed"
                    : isListening
                      ? "bg-red-500 hover:bg-red-400 scale-110"
                      : "bg-white hover:bg-neutral-200"
                }`}
              >
                {isProcessing ? (
                  <svg
                    className="animate-spin h-7 w-7"
                    viewBox="0 0 24 24"
                  >
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
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="white"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-sm text-muted">
              {isProcessing
                ? interimTranscript || "Transcribing..."
                : isListening
                  ? "Recording... click to stop & transcribe"
                  : "Click to start speaking"}
            </p>
            {isListening && (
              <div className="w-full max-w-xs">
                <Waveform audioLevel={audioLevel} isActive={isListening} />
              </div>
            )}
          </div>

          {/* Error */}
          {(speechError || error) && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 text-danger text-sm fade-in">
              {speechError || error}
            </div>
          )}

          {/* Transcript */}
          <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-card-border">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium text-muted">Transcript</h2>
                <select
                  value={providerSettings.provider}
                  onChange={(e) => handleProviderSelect(e.target.value as AIProvider)}
                  className="text-[11px] bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-muted hover:text-foreground hover:border-white/20 transition-colors cursor-pointer outline-none appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center", paddingRight: "20px" }}
                >
                  <option value="groq" className="bg-neutral-900">Groq</option>
                  <option value="cerebras" className="bg-neutral-900">Cerebras</option>
                  <option value="ollama" className="bg-neutral-900">Ollama (Local)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                {transcript && (
                  <>
                    <button
                      onClick={() => handleCopy(transcript, "transcript")}
                      className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
                    >
                      {copied === "transcript" ? "Copied!" : "Copy"}
                    </button>
                    <span className="text-card-border">|</span>
                    <button
                      onClick={handleClear}
                      className="text-xs text-muted hover:text-danger transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="p-5 min-h-[120px]">
              {transcript || interimTranscript ? (
                <div className="text-sm leading-relaxed">
                  <span>{transcript}</span>
                  {interimTranscript && (
                    <span className="text-muted italic">
                      {" "}
                      {interimTranscript}
                    </span>
                  )}
                </div>
              ) : (
                <textarea
                  placeholder="Your speech will appear here, or type/paste text directly..."
                  className="w-full h-full min-h-[80px] bg-transparent text-sm leading-relaxed resize-none outline-none placeholder:text-muted/50"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Mode Selector + Optimize Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex gap-1 bg-card border border-card-border rounded-xl p-1 flex-1">
              {(
                Object.entries(MODE_CONFIG) as [
                  Mode,
                  (typeof MODE_CONFIG)[Mode],
                ][]
              ).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    mode === key
                      ? "bg-white text-black"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleOptimize}
              disabled={!transcript.trim() || isOptimizing}
              className="px-6 py-2.5 bg-white hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-medium rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isOptimizing ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" />
                    <path d="m14 7 3 3" />
                    <path d="M5 6v4" />
                    <path d="M19 14v4" />
                    <path d="M10 2v2" />
                    <path d="M7 8H3" />
                    <path d="M21 16h-4" />
                    <path d="M11 3H9" />
                  </svg>
                  {MODE_CONFIG[mode].label}
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 -mt-2">
            <p className="text-xs text-muted">
              {MODE_CONFIG[mode].description}
            </p>
          </div>

          {/* Optimized Output */}
          {optimizedText && (
            <div className="bg-card border border-white/10 rounded-2xl overflow-hidden fade-in">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/[0.02]">
                <h2 className="text-sm font-medium text-accent">
                  {mode === "optimize"
                    ? "Optimized Prompt"
                    : mode === "refine"
                      ? "Refined Text"
                      : "Summary"}
                </h2>
                <button
                  onClick={() => handleCopy(optimizedText, "optimized")}
                  className="text-xs text-accent hover:text-foreground transition-colors cursor-pointer"
                >
                  {copied === "optimized" ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="p-5">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {optimizedText}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-card-border px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-muted">
          <span>{getSpeechEngineLabel(providerSettings.speechEngine)} + {getProviderLabel(providerSettings.provider)}</span>
          <span>Build by RYC</span>
        </div>
      </footer>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onProviderChange={handleProviderChange}
      />

      {/* History Panel */}
      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

      {/* Update Notification */}
      <UpdateNotification />
    </div>
  );
}
