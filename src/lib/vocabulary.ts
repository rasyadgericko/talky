export interface VocabularyEntry {
  from: string;
  to: string;
}

const STORAGE_KEY = "talky_vocabulary";
const MAX_VOCABULARY_SIZE = 200;

export function getVocabulary(): VocabularyEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migration: if old format (string[]), clear it
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        return [];
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function addEntry(from: string, to: string): VocabularyEntry[] {
  const trimFrom = from.trim();
  const trimTo = to.trim();
  if (!trimFrom || !trimTo) return getVocabulary();

  const vocabulary = getVocabulary();

  // Case-insensitive duplicate check on "from"
  if (vocabulary.some((e) => e.from.toLowerCase() === trimFrom.toLowerCase())) {
    return vocabulary;
  }

  if (vocabulary.length >= MAX_VOCABULARY_SIZE) {
    return vocabulary;
  }

  vocabulary.push({ from: trimFrom, to: trimTo });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vocabulary));
  return vocabulary;
}

export function removeEntry(from: string): VocabularyEntry[] {
  const vocabulary = getVocabulary().filter(
    (e) => e.from.toLowerCase() !== from.toLowerCase()
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vocabulary));
  return vocabulary;
}

export function clearVocabulary(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
}

export function buildVocabularyPrompt(): string {
  const vocabulary = getVocabulary();
  if (vocabulary.length === 0) return "";
  return vocabulary.map((e) => e.to).join(", ");
}

// Post-process transcript: replace trigger words with correct spellings
export function applyVocabulary(text: string): string {
  const vocabulary = getVocabulary();
  if (vocabulary.length === 0) return text;

  let result = text;
  for (const entry of vocabulary) {
    // Escape regex special characters in the "from" string
    const escaped = entry.from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    result = result.replace(regex, entry.to);
  }
  return result;
}
