export type AIProvider = "ollama" | "groq" | "cerebras";

export type Language = string; // ISO 639-1 codes (e.g., "en", "id", "ja") or "auto"

export type SpeechEngine = "whisper-local" | "whisper-groq";

export interface ShortcutSettings {
  dictate: string;
  transform: string;
}

export interface ProviderSettings {
  provider: AIProvider;
  groqApiKey: string;
  cerebrasApiKey: string;
  ollamaUrl: string;
  ollamaModel: string;
  language: Language;
  speechEngine: SpeechEngine;
  soundEnabled: boolean;
  autoPunctuation: boolean;
  shortcuts: ShortcutSettings;
}

const STORAGE_KEY = "talky_provider_settings";

const DEFAULT_SETTINGS: ProviderSettings = {
  provider: "ollama",
  groqApiKey: "",
  cerebrasApiKey: "",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "llama3.2",
  language: "auto",
  speechEngine: "whisper-local",
  soundEnabled: true,
  autoPunctuation: true,
  shortcuts: {
    dictate: "Alt+Space",
    transform: "CommandOrControl+I",
  },
};

export function getSettings(): ProviderSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate old geminiApiKey → cerebrasApiKey
      if (parsed.geminiApiKey && !parsed.cerebrasApiKey) {
        parsed.cerebrasApiKey = "";
        delete parsed.geminiApiKey;
      }
      // Migrate old "gemini" provider → "ollama"
      if (parsed.provider === "gemini") {
        parsed.provider = "ollama";
      }
      // Deep merge nested objects
      if (!parsed.shortcuts || typeof parsed.shortcuts !== "object") {
        parsed.shortcuts = DEFAULT_SETTINGS.shortcuts;
      } else {
        parsed.shortcuts = { ...DEFAULT_SETTINGS.shortcuts, ...parsed.shortcuts };
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: Partial<ProviderSettings>): ProviderSettings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore write errors
  }
  return updated;
}

export function getProviderLabel(provider: AIProvider): string {
  switch (provider) {
    case "groq":
      return "Groq";
    case "cerebras":
      return "Cerebras";
    case "ollama":
      return "Ollama (Local)";
  }
}

export function getProviderDescription(provider: AIProvider): string {
  switch (provider) {
    case "groq":
      return "Llama 3.3 70B via Groq Cloud (free, fast)";
    case "cerebras":
      return "Llama 3.1 8B via Cerebras (free, fastest)";
    case "ollama":
      return "Local model via Ollama";
  }
}

export function getLanguageLabel(lang: Language): string {
  const found = LANGUAGES.find((l) => l.value === lang);
  return found?.label || lang;
}

export function getSpeechEngineLabel(engine: SpeechEngine): string {
  switch (engine) {
    case "whisper-local":
      return "Whisper (Local)";
    case "whisper-groq":
      return "Whisper (Groq)";
  }
}

export function getSpeechEngineDescription(engine: SpeechEngine): string {
  switch (engine) {
    case "whisper-local":
      return "Runs on your device — no internet needed, first use downloads ~145MB model";
    case "whisper-groq":
      return "Fast cloud transcription via Groq — requires Groq API key";
  }
}

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "auto", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "id", label: "Indonesian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
  { value: "nl", label: "Dutch" },
  { value: "ru", label: "Russian" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "th", label: "Thai" },
  { value: "vi", label: "Vietnamese" },
  { value: "ms", label: "Malay" },
  { value: "tr", label: "Turkish" },
  { value: "pl", label: "Polish" },
];

export const SPEECH_ENGINES: { value: SpeechEngine; label: string }[] = [
  { value: "whisper-groq", label: "Groq Cloud" },
  { value: "whisper-local", label: "Local" },
];
