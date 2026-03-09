export interface Snippet {
  id: string;
  title: string;
  text: string;
  createdAt: number;
  usedCount: number;
}

const STORAGE_KEY = "talky_snippets";
const MAX_SNIPPETS = 100;

export function getSnippets(): Snippet[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return [];
}

function save(snippets: Snippet[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  } catch {
    // ignore
  }
}

export function addSnippet(title: string, text: string): Snippet {
  const snippets = getSnippets();
  const newSnippet: Snippet = {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    text,
    createdAt: Date.now(),
    usedCount: 0,
  };
  snippets.unshift(newSnippet);

  if (snippets.length > MAX_SNIPPETS) {
    snippets.length = MAX_SNIPPETS;
  }

  save(snippets);
  return newSnippet;
}

export function deleteSnippet(id: string): void {
  save(getSnippets().filter((s) => s.id !== id));
}

export function updateSnippet(id: string, updates: Partial<Pick<Snippet, "title" | "text">>): void {
  const snippets = getSnippets();
  const idx = snippets.findIndex((s) => s.id === id);
  if (idx !== -1) {
    snippets[idx] = { ...snippets[idx], ...updates };
    save(snippets);
  }
}

export function incrementUsedCount(id: string): void {
  const snippets = getSnippets();
  const idx = snippets.findIndex((s) => s.id === id);
  if (idx !== -1) {
    snippets[idx].usedCount += 1;
    save(snippets);
  }
}

export function searchSnippets(query: string): Snippet[] {
  const snippets = getSnippets();
  if (!query.trim()) return snippets;
  const q = query.toLowerCase();
  return snippets.filter(
    (s) => s.title.toLowerCase().includes(q) || s.text.toLowerCase().includes(q)
  );
}

export function clearSnippets(): void {
  save([]);
}
