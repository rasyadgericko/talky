"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type AIProvider,
  type ProviderSettings,
  getSettings,
  saveSettings,
  getProviderLabel,
  getProviderDescription,
  LANGUAGES,
  getLanguageLabel,
  SPEECH_ENGINES,
  getSpeechEngineLabel,
  getSpeechEngineDescription,
} from "@/lib/settings";

type PermissionStatus = "granted" | "denied" | "prompt" | "checking" | "error";
type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "checking"
  | "no_key"
  | "invalid_key"
  | "error";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onProviderChange?: (settings: ProviderSettings) => void;
}

export default function SettingsPanel({
  isOpen,
  onClose,
  onProviderChange,
}: SettingsPanelProps) {
  const [micStatus, setMicStatus] = useState<PermissionStatus>("checking");
  const [providerStatus, setProviderStatus] =
    useState<ConnectionStatus>("checking");
  const [providerModel, setProviderModel] = useState<string>("");
  const [settings, setSettingsState] = useState<ProviderSettings>(getSettings);

  const [showApiKey, setShowApiKey] = useState(false);

  const updateSettings = useCallback(
    (updates: Partial<ProviderSettings>) => {
      const updated = saveSettings(updates);
      setSettingsState(updated);
      onProviderChange?.(updated);
    },
    [onProviderChange]
  );

  // ─── Microphone ───────────────────────────────────────────────

  const checkMicPermission = useCallback(async () => {
    setMicStatus("checking");
    try {
      // In Electron, use the native API to check macOS system-level permission
      if (window.electronAPI?.getMicrophoneStatus) {
        const status = await window.electronAPI.getMicrophoneStatus();
        // macOS returns: "not-determined", "granted", "denied", "restricted"
        if (status === "granted") {
          setMicStatus("granted");
        } else if (status === "denied" || status === "restricted") {
          setMicStatus("denied");
        } else {
          setMicStatus("prompt"); // not-determined
        }
        return;
      }
      // Fallback for browser: use Permissions API
      if (navigator.permissions) {
        const result = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        setMicStatus(result.state as PermissionStatus);
        result.onchange = () => {
          setMicStatus(result.state as PermissionStatus);
        };
        return;
      }
      setMicStatus("prompt");
    } catch {
      setMicStatus("prompt");
    }
  }, []);

  const requestMicPermission = async () => {
    try {
      // In Electron, trigger the native macOS permission dialog
      if (window.electronAPI?.requestMicrophoneAccess) {
        const granted = await window.electronAPI.requestMicrophoneAccess();
        setMicStatus(granted ? "granted" : "denied");
        return;
      }
      // Fallback: use getUserMedia to trigger browser permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicStatus("granted");
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setMicStatus("denied");
      } else {
        setMicStatus("error");
      }
    }
  };

  // ─── Provider Status ──────────────────────────────────────────

  const checkProviderStatus = useCallback(async () => {
    setProviderStatus("checking");
    try {
      const response = await fetch("/api/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.provider,
          apiKey:
            settings.provider === "groq"
              ? settings.groqApiKey
              : settings.provider === "cerebras"
                ? settings.cerebrasApiKey
                : undefined,
          ollamaUrl: settings.ollamaUrl,
          ollamaModel: settings.ollamaModel,
        }),
      });
      const data = await response.json();
      setProviderStatus(data.status as ConnectionStatus);
      setProviderModel(data.model || "");
    } catch {
      setProviderStatus("error");
    }
  }, [settings]);

  useEffect(() => {
    if (isOpen) {
      checkMicPermission();
      checkProviderStatus();
    }
  }, [isOpen, checkMicPermission, checkProviderStatus]);

  if (!isOpen) return null;

  const providers: AIProvider[] = ["groq", "cerebras", "ollama"];

  // Current provider's API key field
  const currentApiKey =
    settings.provider === "groq"
      ? settings.groqApiKey
      : settings.provider === "cerebras"
        ? settings.cerebrasApiKey
        : "";

  const apiKeyField =
    settings.provider === "groq"
      ? "groqApiKey"
      : settings.provider === "cerebras"
        ? "cerebrasApiKey"
        : null;

  const apiKeyHint =
    settings.provider === "groq"
      ? "console.groq.com"
      : settings.provider === "cerebras"
        ? "cloud.cerebras.ai"
        : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md mx-4 overflow-hidden fade-in max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <h2 className="text-base font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
          >
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content (scrollable) */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* ─── AI Provider Selection ─────────────────────────── */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">AI Provider</p>
                <p className="text-xs text-white/40">
                  {getProviderDescription(settings.provider)}
                </p>
              </div>
              <ProviderStatusBadge status={providerStatus} />
            </div>

            {/* Provider Selector */}
            <div className="flex gap-1 bg-black/30 rounded-lg p-1">
              {providers.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    updateSettings({ provider: p });
                    setShowApiKey(false);
                  }}
                  className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    settings.provider === p
                      ? "bg-white text-black"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {getProviderLabel(p).replace(" (Local)", "")}
                </button>
              ))}
            </div>

            {/* API Key Input (for Groq / Cerebras) */}
            {apiKeyField && (
              <div className="space-y-2">
                <div className="flex-1 relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    placeholder={`Enter ${getProviderLabel(settings.provider)} API key`}
                    value={currentApiKey}
                    onChange={(e) =>
                      updateSettings({ [apiKeyField]: e.target.value })
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/30 transition-colors pr-8"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      {showApiKey ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
                <p className="text-[10px] text-white/30">
                  Free API key from{" "}
                  <span className="text-white/50">{apiKeyHint}</span>
                </p>
                {providerStatus === "invalid_key" && (
                  <p className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2">
                    Invalid API key. Please check and try again.
                  </p>
                )}
              </div>
            )}

            {/* Ollama status */}
            {settings.provider === "ollama" && (
              <div className="space-y-2">
                {providerStatus === "disconnected" && (
                  <p className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2">
                    Cannot connect to Ollama. Make sure the Ollama app is
                    running.
                  </p>
                )}
                {providerStatus === "connected" && (
                  <p className="text-xs text-green-400 bg-green-500/10 rounded-lg p-2">
                    Ollama connected
                    {providerModel ? ` — model: ${providerModel}` : ""}
                  </p>
                )}
              </div>
            )}

            {/* Test Connection */}
            <button
              onClick={checkProviderStatus}
              className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Test Connection
            </button>

            {providerStatus === "connected" &&
              settings.provider !== "ollama" && (
                <p className="text-xs text-green-400 bg-green-500/10 rounded-lg p-2 text-center">
                  {getProviderLabel(settings.provider)} is working
                  {providerModel ? ` — ${providerModel}` : ""}
                </p>
              )}
          </div>

          {/* ─── Speech Engine Selection ──────────────────────── */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Speech Engine</p>
                <p className="text-xs text-white/40">
                  {getSpeechEngineDescription(settings.speechEngine)}
                </p>
              </div>
            </div>

            <div className="flex gap-1 bg-black/30 rounded-lg p-1">
              {SPEECH_ENGINES.map((eng) => (
                <button
                  key={eng.value}
                  onClick={() => updateSettings({ speechEngine: eng.value })}
                  className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    settings.speechEngine === eng.value
                      ? "bg-white text-black"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {eng.label}
                </button>
              ))}
            </div>

            {settings.speechEngine === "whisper-groq" && !settings.groqApiKey && (
              <p className="text-xs text-yellow-400 bg-yellow-500/10 rounded-lg p-2">
                Groq cloud transcription requires a Groq API key. Add one above or switch AI Provider to Groq.
              </p>
            )}
          </div>

          {/* ─── Language Selection ─────────────────────────────── */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 8 6 6" />
                  <path d="m4 14 6-6 2-3" />
                  <path d="M2 5h12" />
                  <path d="M7 2h1" />
                  <path d="m22 22-5-10-5 10" />
                  <path d="M14 18h6" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Language</p>
                <p className="text-xs text-white/40">
                  {getLanguageLabel(settings.language)}
                </p>
              </div>
            </div>

            <LanguageDropdown
              value={settings.language}
              onChange={(lang) => updateSettings({ language: lang })}
            />
          </div>

          {/* ─── Microphone Permission ─────────────────────────── */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
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
                  <p className="text-sm font-medium text-white">Microphone</p>
                  <p className="text-xs text-white/40">
                    Required for speech input
                  </p>
                </div>
              </div>
              <StatusBadge status={micStatus} />
            </div>

            {micStatus === "denied" && (
              <p className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2.5">
                Microphone access is denied. Open{" "}
                <strong>
                  System Settings &rarr; Privacy &amp; Security &rarr;
                  Microphone
                </strong>{" "}
                and enable it for Talky, then restart the app.
              </p>
            )}

            {(micStatus === "prompt" || micStatus === "error") && (
              <button
                onClick={requestMicPermission}
                className="w-full py-2 bg-white text-black text-xs font-medium rounded-lg hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Grant Microphone Access
              </button>
            )}

            {micStatus === "granted" && (
              <p className="text-xs text-green-400 bg-green-500/10 rounded-lg p-2.5">
                Microphone is working.
              </p>
            )}
          </div>

          {/* ─── Privacy Note ──────────────────────────────────── */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Privacy</p>
                <p className="text-xs text-white/40 mt-0.5">
                  {settings.provider === "ollama" && settings.speechEngine === "whisper-local"
                    ? "All processing happens on your device. Speech is transcribed locally with Whisper, and text optimization uses Ollama. No data ever leaves your machine."
                    : settings.speechEngine === "whisper-groq"
                      ? `Speech is transcribed via Groq cloud. Text optimization uses ${getProviderLabel(settings.provider)}${settings.provider === "ollama" ? " (local)" : " cloud API"}. API keys are stored locally.`
                      : `Speech is transcribed locally with Whisper. Text optimization uses ${getProviderLabel(settings.provider)} cloud API. Your API key is stored locally and never shared.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 shrink-0">
          <p className="text-xs text-white/30 text-center">
            Talky v0.1.0 &middot; Build by RYC
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: PermissionStatus | "connected" | "disconnected";
}) {
  if (status === "checking") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-white/40">
        <span className="w-2 h-2 rounded-full bg-white/40 animate-pulse" />
        Checking
      </span>
    );
  }
  if (status === "granted" || status === "connected") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-green-400">
        <span className="w-2 h-2 rounded-full bg-green-400" />
        Active
      </span>
    );
  }
  if (
    status === "denied" ||
    status === "disconnected" ||
    status === "error"
  ) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-400">
        <span className="w-2 h-2 rounded-full bg-red-400" />
        {status === "denied"
          ? "Denied"
          : status === "error"
            ? "Error"
            : "Offline"}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-yellow-400">
      <span className="w-2 h-2 rounded-full bg-yellow-400" />
      Not Set
    </span>
  );
}

function ProviderStatusBadge({ status }: { status: ConnectionStatus }) {
  switch (status) {
    case "checking":
      return (
        <span className="flex items-center gap-1.5 text-xs text-white/40">
          <span className="w-2 h-2 rounded-full bg-white/40 animate-pulse" />
          Checking
        </span>
      );
    case "connected":
      return (
        <span className="flex items-center gap-1.5 text-xs text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          Connected
        </span>
      );
    case "no_key":
      return (
        <span className="flex items-center gap-1.5 text-xs text-yellow-400">
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          Need Key
        </span>
      );
    case "invalid_key":
      return (
        <span className="flex items-center gap-1.5 text-xs text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          Invalid Key
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1.5 text-xs text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          Offline
        </span>
      );
  }
}

function LanguageDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (lang: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = LANGUAGES.filter((lang) =>
    lang.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-black/30 rounded-lg px-3 py-2 text-xs text-white hover:bg-black/50 transition-colors cursor-pointer"
      >
        <span>{getLanguageLabel(value)}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-[#111] border border-white/10 rounded-lg overflow-hidden shadow-xl">
          <div className="p-2 border-b border-white/10">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search languages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/30"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((lang) => (
              <button
                key={lang.value}
                onClick={() => {
                  onChange(lang.value);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer ${
                  value === lang.value
                    ? "bg-white/10 text-white font-medium"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {lang.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-white/30">No languages found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
