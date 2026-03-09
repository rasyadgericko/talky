/**
 * Convert spoken formatting cues into markdown syntax.
 * Applied after punctuation fix, before paste.
 */

const FORMATTING_RULES: { pattern: RegExp; replacement: string }[] = [
  // "bullet point <text>" or "bullet <text>"
  { pattern: /(?:^|\n)\s*(?:bullet point|bullet)\s+/gi, replacement: "\n- " },

  // "new paragraph" -> double newline
  { pattern: /\s*new paragraph\s*/gi, replacement: "\n\n" },

  // "heading <text>" or "title <text>"
  { pattern: /(?:^|\n)\s*(?:heading|title)\s+/gi, replacement: "\n# " },

  // "sub heading <text>"
  { pattern: /(?:^|\n)\s*(?:sub ?heading|subheading)\s+/gi, replacement: "\n## " },

  // "bold <text> end bold"
  { pattern: /\bbold\s+(.*?)\s+end bold\b/gi, replacement: "**$1**" },

  // "italic <text> end italic"
  { pattern: /\bitalic\s+(.*?)\s+end italic\b/gi, replacement: "*$1*" },

  // "number one" through "number five" -> ordered list
  { pattern: /(?:^|\n)\s*number one\s+/gi, replacement: "\n1. " },
  { pattern: /(?:^|\n)\s*number two\s+/gi, replacement: "\n2. " },
  { pattern: /(?:^|\n)\s*number three\s+/gi, replacement: "\n3. " },
  { pattern: /(?:^|\n)\s*number four\s+/gi, replacement: "\n4. " },
  { pattern: /(?:^|\n)\s*number five\s+/gi, replacement: "\n5. " },

  // "new line" -> single newline
  { pattern: /\s*new line\s*/gi, replacement: "\n" },

  // "code <text> end code" -> inline code
  { pattern: /\bcode\s+(.*?)\s+end code\b/gi, replacement: "`$1`" },
];

export function applyFormatting(text: string): string {
  if (!text || !text.trim()) return text;

  let result = text;

  for (const rule of FORMATTING_RULES) {
    result = result.replace(rule.pattern, rule.replacement);
  }

  // Clean up extra whitespace around newlines
  result = result.replace(/\n{3,}/g, "\n\n");

  return result.trim();
}
