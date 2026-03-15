"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type ProviderSettings,
  getSettings,
  saveSettings,
  LANGUAGES,
  getLanguageLabel,
} from "@/lib/settings";
import { getStats, formatTimeSaved } from "@/lib/stats";
import { getSession, signOut, getUserTier, openCheckout, isOwnerMode, type UserTier } from "@/lib/auth";
import { getLocalUsage, getRemainingWords, getUsagePercent, getWordLimit } from "@/lib/usage";
import { type VocabularyEntry, getVocabulary, addEntry, removeEntry, clearVocabulary } from "@/lib/vocabulary";
import AuthModal from "@/components/AuthModal";

type PermissionStatus = "granted" | "denied" | "prompt" | "checking" | "error";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: ProviderSettings) => void;
  inline?: boolean;
  tier: UserTier;
  onTierChange?: (tier: UserTier) => void;
}

export default function SettingsPanel({
  isOpen,
  onClose,
  onSettingsChange,
  inline,
  tier,
  onTierChange,
}: SettingsPanelProps) {
  const [micStatus, setMicStatus] = useState<PermissionStatus>("checking");
  const [settings, setSettingsState] = useState<ProviderSettings>(getSettings);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [vocabulary, setVocabulary] = useState<VocabularyEntry[]>([]);
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");

  const updateSettings = useCallback(
    (updates: Partial<ProviderSettings>) => {
      const updated = saveSettings(updates);
      setSettingsState(updated);
      onSettingsChange?.(updated);
    },
    [onSettingsChange]
  );

  // ─── Auth Status ───────────────────────────────────────────────

  const checkAuth = useCallback(async () => {
    const session = await getSession();
    setUserEmail(session?.user?.email || null);
    if (session) {
      const t = await getUserTier();
      onTierChange?.(t);
    }
  }, [onTierChange]);

  // ─── Microphone ───────────────────────────────────────────────

  const checkMicPermission = useCallback(async () => {
    setMicStatus("checking");
    try {
      if (window.electronAPI?.getMicrophoneStatus) {
        const status = await window.electronAPI.getMicrophoneStatus();
        if (status === "granted") setMicStatus("granted");
        else if (status === "denied" || status === "restricted") setMicStatus("denied");
        else setMicStatus("prompt");
        return;
      }
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
        setMicStatus(result.state as PermissionStatus);
        result.onchange = () => setMicStatus(result.state as PermissionStatus);
        return;
      }
      setMicStatus("prompt");
    } catch {
      setMicStatus("prompt");
    }
  }, []);

  const requestMicPermission = async () => {
    try {
      if (window.electronAPI?.requestMicrophoneAccess) {
        const granted = await window.electronAPI.requestMicrophoneAccess();
        setMicStatus(granted ? "granted" : "denied");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicStatus("granted");
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") setMicStatus("denied");
      else setMicStatus("error");
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkMicPermission();
      checkAuth();
      setVocabulary(getVocabulary());
    }
  }, [isOpen, checkMicPermission, checkAuth]);

  const handleAddEntry = () => {
    const trimFrom = newFrom.trim();
    const trimTo = newTo.trim();
    if (!trimFrom || !trimTo) return;
    const updated = addEntry(trimFrom, trimTo);
    setVocabulary(updated);
    setNewFrom("");
    setNewTo("");
  };

  const handleRemoveEntry = (from: string) => {
    const updated = removeEntry(from);
    setVocabulary(updated);
  };

  const handleClearVocabulary = () => {
    clearVocabulary();
    setVocabulary([]);
  };

  if (!isOpen) return null;

  const handleSignOut = async () => {
    await signOut();
    setUserEmail(null);
    onTierChange?.("free");
  };

  const handleUpgrade = async () => {
    const session = await getSession();
    if (!session) {
      setShowAuth(true);
      return;
    }
    await openCheckout();
  };

  const usage = getLocalUsage();
  const isFree = tier === "free";
  const ownerMode = isOwnerMode();

  const settingsContent = (
    <>
      {/* ─── Account Section (hidden in owner mode) ───── */}
      {!ownerMode && (
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Account</p>
              {userEmail ? (
                <p className="text-xs text-white/40 truncate">{userEmail}</p>
              ) : (
                <p className="text-xs text-white/40">Sign in to unlock Pro features</p>
              )}
            </div>
            {tier === "pro" && (
              <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-full text-[10px] font-semibold text-purple-300">
                PRO
              </span>
            )}
          </div>

          {userEmail ? (
            <div className="space-y-2">
              {isFree && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-white/40">{usage.wordCount.toLocaleString()} / {getWordLimit().toLocaleString()} words</span>
                      <span className="text-white/40">{getRemainingWords().toLocaleString()} remaining</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getUsagePercent() >= 90 ? "bg-red-500" : getUsagePercent() >= 70 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${getUsagePercent()}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleUpgrade}
                    className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-medium rounded-lg transition-all cursor-pointer"
                  >
                    Upgrade to Pro — $6/mo
                  </button>
                </>
              )}
              <button
                onClick={handleSignOut}
                className="w-full py-1.5 text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/40">{usage.wordCount.toLocaleString()} / {getWordLimit().toLocaleString()} words</span>
                  <span className="text-white/40">{getRemainingWords().toLocaleString()} remaining</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getUsagePercent() >= 90 ? "bg-red-500" : getUsagePercent() >= 70 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${getUsagePercent()}%` }}
                  />
                </div>
              </div>
              <button
                onClick={() => setShowAuth(true)}
                className="w-full py-2 bg-white text-black text-xs font-medium rounded-lg hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Sign In / Create Account
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Engine Selector (owner mode only) ─────────── */}
      {ownerMode && (
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4" /><path d="M12 18v4" /><path d="m4.93 4.93 2.83 2.83" /><path d="m16.24 16.24 2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" /><path d="m4.93 19.07 2.83-2.83" /><path d="m16.24 7.76 2.83-2.83" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Transcription Engine</p>
              <p className="text-xs text-white/40">{settings.engine === "groq" ? "Groq Cloud (whisper-large-v3)" : "Local Whisper (on-device)"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => updateSettings({ engine: "groq" })}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${settings.engine === "groq" ? "bg-white text-black" : "bg-white/10 text-white/50 hover:bg-white/15"}`}
            >
              Groq Cloud
            </button>
            <button
              onClick={() => updateSettings({ engine: "local" })}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${settings.engine === "local" ? "bg-white text-black" : "bg-white/10 text-white/50 hover:bg-white/15"}`}
            >
              Local Whisper
            </button>
          </div>
        </div>
      )}

      {/* ─── Language Selection ─────────────────────────── */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="m22 22-5-10-5 10" /><path d="M14 18h6" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              Language
              {!ownerMode && isFree && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-[9px] font-semibold text-purple-300">PRO</span>
              )}
            </p>
            <p className="text-xs text-white/40">
              {!ownerMode && isFree ? "English only — upgrade for 15+ languages" : getLanguageLabel(settings.language)}
            </p>
          </div>
        </div>
        {!ownerMode && isFree ? (
          <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
            <span className="text-xs text-white/50">English</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="ml-auto opacity-30">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        ) : (
          <LanguageDropdown value={settings.language} onChange={(lang) => updateSettings({ language: lang })} />
        )}
      </div>

      {/* ─── Custom Vocabulary ────────────────────────── */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Custom Vocabulary</p>
            <p className="text-xs text-white/40">Replace misheard words with correct spellings</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={newFrom}
              onChange={(e) => setNewFrom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddEntry(); }}
              placeholder="When I hear..."
              className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/20"
            />
            <span className="text-white/30 text-xs shrink-0">&rarr;</span>
            <input
              type="text"
              value={newTo}
              onChange={(e) => setNewTo(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddEntry(); }}
              placeholder="Replace with..."
              className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/20"
            />
          </div>
          <button
            onClick={handleAddEntry}
            className="w-full py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Add
          </button>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-white/30">{vocabulary.length}/200 entries</p>
          {vocabulary.length > 0 && (
            <button
              onClick={handleClearVocabulary}
              className="text-[10px] text-white/30 hover:text-white/50 transition-colors cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>
        {vocabulary.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {vocabulary.map((entry) => (
              <span key={entry.from} className="inline-flex items-center gap-1 px-2 py-1 bg-white/[0.08] border border-white/10 rounded-md text-[11px] text-white/70">
                {entry.from} <span className="text-white/30">&rarr;</span> {entry.to}
                <button
                  onClick={() => handleRemoveEntry(entry.from)}
                  className="text-white/30 hover:text-white/70 transition-colors cursor-pointer"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ─── Microphone Permission ─────────────────────── */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Microphone</p>
              <p className="text-xs text-white/40">Required for speech input</p>
            </div>
          </div>
          <StatusBadge status={micStatus} />
        </div>
        {micStatus === "denied" && (
          <p className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2.5">
            Microphone access is denied. Open <strong>System Settings &rarr; Privacy &amp; Security &rarr; Microphone</strong> and enable it for Talky, then restart the app.
          </p>
        )}
        {(micStatus === "prompt" || micStatus === "error") && (
          <button onClick={requestMicPermission} className="w-full py-2 bg-white text-black text-xs font-medium rounded-lg hover:bg-neutral-200 transition-colors cursor-pointer">Grant Microphone Access</button>
        )}
        {micStatus === "granted" && (
          <p className="text-xs text-green-400 bg-green-500/10 rounded-lg p-2.5">Microphone is working.</p>
        )}
      </div>

      {/* ─── Sound Feedback ──────────────────────────── */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
        <ToggleRow
          label="Sound Feedback"
          description="Play sounds on record start/stop and paste"
          checked={settings.soundEnabled}
          onChange={(v) => updateSettings({ soundEnabled: v })}
          icon={
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            </div>
          }
        />
      </div>

      {/* ─── Keyboard Shortcuts ──────────────────────── */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.001" /><path d="M10 8h.001" /><path d="M14 8h.001" /><path d="M18 8h.001" />
              <path d="M6 12h.001" /><path d="M18 12h.001" />
              <path d="M8 16h8" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Keyboard Shortcuts</p>
            <p className="text-xs text-white/40">Click to remap, press new keys</p>
          </div>
        </div>
        <div className="space-y-2">
          <ShortcutInput
            label="Dictate"
            value={settings.shortcuts.dictate}
            onChange={(v) => {
              const newShortcuts = { ...settings.shortcuts, dictate: v };
              updateSettings({ shortcuts: newShortcuts });
              window.electronAPI?.updateShortcuts?.(newShortcuts.dictate, newShortcuts.transform);
            }}
          />
          <ShortcutInput
            label="Transform"
            value={settings.shortcuts.transform}
            onChange={(v) => {
              const newShortcuts = { ...settings.shortcuts, transform: v };
              updateSettings({ shortcuts: newShortcuts });
              window.electronAPI?.updateShortcuts?.(newShortcuts.dictate, newShortcuts.transform);
            }}
          />
        </div>
        <div className="pt-2 border-t border-white/5 space-y-1.5">
          <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider">Tips</p>
          <p className="text-[11px] text-white/40">Press the shortcut again while recording to stop and transcribe.</p>
          {!ownerMode && isFree && (
            <p className="text-[11px] text-purple-300/60">Transform mode requires Pro.</p>
          )}
        </div>
      </div>

      {/* ─── Usage Statistics ────────────────────────── */}
      <StatsSection />

      {/* ─── Privacy Note ────────────────────────────── */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Privacy</p>
            <p className="text-xs text-white/40 mt-0.5">
              {ownerMode
                ? settings.engine === "groq"
                  ? "Speech is transcribed via Groq cloud using your API key. AI optimization uses Groq LLaMA."
                  : "All processing happens on your device. Speech is transcribed locally with Whisper."
                : isFree
                  ? "All processing happens on your device. Speech is transcribed locally with Whisper. No data leaves your machine."
                  : "Speech is transcribed via Groq cloud through our secure proxy. Your API keys are never needed — we handle everything server-side."}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Check for Updates ─────────────────────────── */}
      <CheckForUpdatesButton />
    </>
  );

  const panel = inline ? (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#0a0a0a]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <h2 className="text-sm font-semibold text-white">Settings</h2>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="p-4 space-y-3 overflow-y-auto flex-1">{settingsContent}</div>
      <div className="px-4 py-2 border-t border-white/10 shrink-0 space-y-2">
        <button onClick={() => window.open("https://talky.app", "_blank")} className="w-full py-1.5 flex items-center justify-center gap-1.5 text-[11px] text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
          Visit our website
        </button>
        <p className="text-[10px] text-white/30 text-center">Talky v2.0.0 &middot; Built by RYC</p>
      </div>
    </div>
  ) : (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md mx-4 overflow-hidden fade-in max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <h2 className="text-base font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">{settingsContent}</div>
        <div className="px-5 py-3 border-t border-white/10 shrink-0 space-y-2">
          <button onClick={() => window.open("https://talky.app", "_blank")} className="w-full py-2 flex items-center justify-center gap-1.5 text-xs text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
            Visit our website
          </button>
          <p className="text-xs text-white/30 text-center">Talky v2.0.0 &middot; Built by RYC</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {panel}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => {
          checkAuth();
          setShowAuth(false);
        }}
      />
    </>
  );
}

function StatusBadge({ status }: { status: PermissionStatus }) {
  if (status === "checking") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-white/40">
        <span className="w-2 h-2 rounded-full bg-white/40 animate-pulse" />Checking
      </span>
    );
  }
  if (status === "granted") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-green-400">
        <span className="w-2 h-2 rounded-full bg-green-400" />Active
      </span>
    );
  }
  if (status === "denied" || status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-400">
        <span className="w-2 h-2 rounded-full bg-red-400" />{status === "denied" ? "Denied" : "Error"}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-yellow-400">
      <span className="w-2 h-2 rounded-full bg-yellow-400" />Not Set
    </span>
  );
}

function ToggleRow({ label, description, checked, onChange, icon }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void; icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white">{label}</p>
        <p className="text-[10px] text-white/40">{description}</p>
      </div>
      <button onClick={() => onChange(!checked)} className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${checked ? "bg-green-500" : "bg-white/20"}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : ""}`} />
      </button>
    </div>
  );
}

function ShortcutInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [recording, setRecording] = useState(false);

  const formatDisplay = (accel: string) => {
    const isMac = typeof navigator !== "undefined" && navigator.platform?.includes("Mac");
    return accel.replace("CommandOrControl", isMac ? "\u2318" : "Ctrl").replace("Alt", isMac ? "\u2325" : "Alt").replace("Shift", isMac ? "\u21E7" : "Shift").replace(/\+/g, " ");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return;
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push("CommandOrControl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    let key = e.key;
    if (key === " ") key = "Space";
    else if (key.length === 1) key = key.toUpperCase();
    parts.push(key);
    onChange(parts.join("+"));
    setRecording(false);
  };

  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-white/50 w-20 shrink-0">{label}</p>
      {recording ? (
        <div onKeyDown={handleKeyDown} onBlur={() => setRecording(false)} tabIndex={0} autoFocus className="flex-1 px-2 py-1 bg-white/10 border border-white/30 rounded-md text-[10px] font-mono text-yellow-400 text-center outline-none animate-pulse">Press keys...</div>
      ) : (
        <button onClick={() => setRecording(true)} className="flex-1 px-2 py-1 bg-white/8 border border-white/10 rounded-md text-[10px] font-mono font-medium text-white text-center hover:bg-white/15 transition-colors cursor-pointer">{formatDisplay(value)}</button>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-black/30 rounded-lg p-2.5 text-center">
      <p className="text-sm font-semibold text-white">{value}</p>
      <p className="text-[9px] text-white/40 mt-0.5">{label}</p>
    </div>
  );
}

function StatsSection() {
  const stats = getStats();
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">Usage Statistics</p>
          <p className="text-xs text-white/40">Your productivity at a glance</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Words" value={stats.totalWords.toLocaleString()} />
        <StatCard label="Time Saved" value={formatTimeSaved(stats.totalTimeSavedSeconds)} />
        <StatCard label="Sessions" value={stats.totalSessions} />
        <StatCard label="Streak" value={`${stats.streakDays}d`} />
        <StatCard label="Dictations" value={stats.dictateCount} />
        <StatCard label="Transforms" value={stats.transformCount} />
      </div>
    </div>
  );
}

function CheckForUpdatesButton() {
  const [status, setStatus] = useState<"idle" | "checking" | "up-to-date" | "error">("idle");

  useEffect(() => {
    const cleanup = window.electronAPI?.onUpdateNotAvailable(() => {
      setStatus("up-to-date");
      setTimeout(() => setStatus("idle"), 3000);
    });
    return () => { cleanup?.(); };
  }, []);

  const handleCheck = async () => {
    if (!window.electronAPI?.checkForUpdates) return;
    setStatus("checking");
    try {
      const result = await window.electronAPI.checkForUpdates();
      if (!result.checking) {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
      // If an update IS available, the UpdateNotification component handles it
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  if (!window.electronAPI?.checkForUpdates) return null;

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Updates</p>
          <p className="text-xs text-white/40">
            {status === "checking" ? "Checking..." : status === "up-to-date" ? "You're up to date!" : status === "error" ? "Could not check for updates" : "Check for new versions"}
          </p>
        </div>
        <button
          onClick={handleCheck}
          disabled={status === "checking"}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white text-[11px] font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {status === "checking" ? (
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : status === "up-to-date" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : "Check"}
        </button>
      </div>
    </div>
  );
}

function LanguageDropdown({ value, onChange }: { value: string; onChange: (lang: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = LANGUAGES.filter((lang) => lang.label.toLowerCase().includes(search.toLowerCase()));

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
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between bg-black/30 rounded-lg px-3 py-2 text-xs text-white hover:bg-black/50 transition-colors cursor-pointer">
        <span>{getLanguageLabel(value)}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${isOpen ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-[#111] border border-white/10 rounded-lg overflow-hidden shadow-xl">
          <div className="p-2 border-b border-white/10">
            <input ref={inputRef} type="text" placeholder="Search languages..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/30" />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((lang) => (
              <button key={lang.value} onClick={() => { onChange(lang.value); setIsOpen(false); setSearch(""); }} className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer ${value === lang.value ? "bg-white/10 text-white font-medium" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
                {lang.label}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-xs text-white/30">No languages found</p>}
          </div>
        </div>
      )}
    </div>
  );
}
