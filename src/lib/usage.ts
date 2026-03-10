import { isOwnerMode } from "@/lib/auth";

const STORAGE_KEY = "talky_monthly_usage";
const FREE_WORD_LIMIT = 5000;

interface MonthlyUsage {
  month: string; // "YYYY-MM"
  wordCount: number;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getLocalUsage(): MonthlyUsage {
  if (typeof window === "undefined") {
    return { month: getCurrentMonth(), wordCount: 0 };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: MonthlyUsage = JSON.parse(stored);
      // Auto-reset if new month
      if (parsed.month !== getCurrentMonth()) {
        const fresh: MonthlyUsage = { month: getCurrentMonth(), wordCount: 0 };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        return fresh;
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  return { month: getCurrentMonth(), wordCount: 0 };
}

export function addLocalWords(count: number): MonthlyUsage {
  const current = getLocalUsage();
  const updated: MonthlyUsage = {
    month: current.month,
    wordCount: current.wordCount + count,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export function isOverLimit(): boolean {
  if (isOwnerMode()) return false;
  return getLocalUsage().wordCount >= FREE_WORD_LIMIT;
}

export function getRemainingWords(): number {
  if (isOwnerMode()) return Infinity;
  return Math.max(0, FREE_WORD_LIMIT - getLocalUsage().wordCount);
}

export function getUsagePercent(): number {
  return Math.min(100, (getLocalUsage().wordCount / FREE_WORD_LIMIT) * 100);
}

export function getWordLimit(): number {
  return FREE_WORD_LIMIT;
}
