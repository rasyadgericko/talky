export interface PromptTemplate {
  id: string;
  name: string;
  instruction: string;
  createdAt: number;
}

const STORAGE_KEY = "talky_prompt_templates";

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: "default-professional",
    name: "Make Professional",
    instruction: "Rewrite this text to sound more professional and formal",
    createdAt: 0,
  },
  {
    id: "default-casual",
    name: "Make Casual",
    instruction: "Rewrite this text to sound more casual and conversational",
    createdAt: 0,
  },
  {
    id: "default-grammar",
    name: "Fix Grammar",
    instruction: "Fix all grammar, spelling, and punctuation errors in this text",
    createdAt: 0,
  },
  {
    id: "default-shorter",
    name: "Make Shorter",
    instruction: "Make this text more concise while keeping all key information",
    createdAt: 0,
  },
  {
    id: "default-translate-en",
    name: "Translate to English",
    instruction: "Translate this text to English, maintaining the original tone",
    createdAt: 0,
  },
];

export function getTemplates(): PromptTemplate[] {
  if (typeof window === "undefined") return DEFAULT_TEMPLATES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore parse errors
  }
  // Initialize with defaults
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
  return DEFAULT_TEMPLATES;
}

export function saveTemplate(template: Omit<PromptTemplate, "id" | "createdAt">): PromptTemplate {
  const templates = getTemplates();
  const newTemplate: PromptTemplate = {
    ...template,
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  templates.push(newTemplate);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return newTemplate;
}

export function updateTemplate(id: string, updates: Partial<Pick<PromptTemplate, "name" | "instruction">>): void {
  const templates = getTemplates();
  const idx = templates.findIndex((t) => t.id === id);
  if (idx !== -1) {
    templates[idx] = { ...templates[idx], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }
}

export function deleteTemplate(id: string): void {
  const templates = getTemplates().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function reorderTemplates(templates: PromptTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}
