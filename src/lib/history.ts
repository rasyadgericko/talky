export interface TranscriptEntry {
  id: string;
  text: string;
  optimizedText?: string;
  mode?: string;
  timestamp: number;
  appName?: string;
}

const STORAGE_KEY = "talky_transcript_history";
const MAX_ENTRIES = 500;

export function getHistory(): TranscriptEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return [];
}

export function addEntry(entry: Omit<TranscriptEntry, "id" | "timestamp">): TranscriptEntry {
  const history = getHistory();
  const newEntry: TranscriptEntry = {
    ...entry,
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };
  history.unshift(newEntry); // newest first

  // Cap at MAX_ENTRIES
  if (history.length > MAX_ENTRIES) {
    history.length = MAX_ENTRIES;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return newEntry;
}

export function deleteEntry(id: string): void {
  const history = getHistory().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function searchHistory(query: string): TranscriptEntry[] {
  const history = getHistory();
  if (!query.trim()) return history;
  const q = query.toLowerCase();
  return history.filter(
    (e) =>
      e.text.toLowerCase().includes(q) ||
      (e.optimizedText && e.optimizedText.toLowerCase().includes(q)) ||
      (e.appName && e.appName.toLowerCase().includes(q))
  );
}

export function clearHistory(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
}
