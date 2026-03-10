export type Language = string; // ISO 639-1 codes (e.g., "en", "id", "ja") or "auto"

export interface ShortcutSettings {
  dictate: string;
  transform: string;
}

export type TranscriptionEngine = "groq" | "local";

export interface ProviderSettings {
  language: Language;
  soundEnabled: boolean;
  shortcuts: ShortcutSettings;
  engine: TranscriptionEngine;
}

const STORAGE_KEY = "talky_provider_settings";

const DEFAULT_SETTINGS: ProviderSettings = {
  language: "en",
  soundEnabled: true,
  shortcuts: {
    dictate: "Alt+Space",
    transform: "CommandOrControl+I",
  },
  engine: "groq",
};

export function getSettings(): ProviderSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Deep merge nested objects
      if (!parsed.shortcuts || typeof parsed.shortcuts !== "object") {
        parsed.shortcuts = DEFAULT_SETTINGS.shortcuts;
      } else {
        parsed.shortcuts = { ...DEFAULT_SETTINGS.shortcuts, ...parsed.shortcuts };
      }
      // Migration: drop removed fields silently
      const { language, soundEnabled, shortcuts, engine } = {
        ...DEFAULT_SETTINGS,
        ...parsed,
      };
      return { language, soundEnabled, shortcuts, engine };
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

export function getLanguageLabel(lang: Language): string {
  const found = LANGUAGES.find((l) => l.value === lang);
  return found?.label || lang;
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
