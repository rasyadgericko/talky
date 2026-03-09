/**
 * Post-process transcribed text to fix common punctuation issues.
 * Pure string processing — no external dependencies.
 */
export function fixPunctuation(text: string): string {
  if (!text || !text.trim()) return text;

  let result = text;

  // Fix double/triple periods
  result = result.replace(/\.{2,}/g, ".");

  // Fix double spaces
  result = result.replace(/ {2,}/g, " ");

  // Remove space before punctuation
  result = result.replace(/ ([.,!?;:])/g, "$1");

  // Ensure space after punctuation (except inside numbers like 3.14)
  result = result.replace(/([.,!?;:])([A-Za-z])/g, "$1 $2");

  // Capitalize after sentence-ending punctuation
  result = result.replace(/([.!?])\s+([a-z])/g, (_, p, c) => `${p} ${c.toUpperCase()}`);

  // Capitalize first character
  if (result.length > 0 && /[a-z]/.test(result[0])) {
    result = result[0].toUpperCase() + result.slice(1);
  }

  // Fix trailing spaces
  result = result.trimEnd();

  // Ensure final period if text doesn't end with punctuation
  if (result.length > 0 && !/[.!?]$/.test(result)) {
    result += ".";
  }

  return result;
}
