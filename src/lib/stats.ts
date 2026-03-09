const STORAGE_KEY = "talky_usage_stats";

export interface UsageStats {
  totalWords: number;
  totalSessions: number;
  totalTimeSavedSeconds: number;
  dictateCount: number;
  transformCount: number;
  streakDays: number;
  lastUsedDate: string; // ISO date string "YYYY-MM-DD"
}

const DEFAULT_STATS: UsageStats = {
  totalWords: 0,
  totalSessions: 0,
  totalTimeSavedSeconds: 0,
  dictateCount: 0,
  transformCount: 0,
  streakDays: 0,
  lastUsedDate: "",
};

export function getStats(): UsageStats {
  if (typeof window === "undefined") return { ...DEFAULT_STATS };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_STATS, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return { ...DEFAULT_STATS };
}

function saveStats(stats: UsageStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

/**
 * Record a transcription session.
 * @param wordCount - number of words transcribed
 * @param mode - "dictate" or "transform"
 */
export function trackSession(wordCount: number, mode: "dictate" | "transform"): void {
  const stats = getStats();

  stats.totalWords += wordCount;
  stats.totalSessions += 1;

  // Time saved estimate: speaking ~150 WPM vs typing ~40 WPM
  // Time saved per word ≈ (1/40 - 1/150) minutes ≈ 1.1 seconds
  stats.totalTimeSavedSeconds += Math.round(wordCount * 1.1);

  if (mode === "dictate") stats.dictateCount += 1;
  if (mode === "transform") stats.transformCount += 1;

  // Streak tracking
  const today = new Date().toISOString().slice(0, 10);
  if (stats.lastUsedDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (stats.lastUsedDate === yesterday) {
      stats.streakDays += 1;
    } else {
      stats.streakDays = 1;
    }
    stats.lastUsedDate = today;
  }

  saveStats(stats);
}

/** Format seconds into human-readable string */
export function formatTimeSaved(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
