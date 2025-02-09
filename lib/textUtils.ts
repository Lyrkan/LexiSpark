/**
 * Normalizes text by:
 * 1. Converting to lowercase
 * 2. Replacing special ligatures (œ/Œ -> oe, æ/Æ -> ae)
 * 3. Removing accents/diacritics
 * 4. Removing non-letter characters
 */
export function normalizeText(text: string): string {
  return (
    text
      .toLowerCase()
      // Replace ligatures
      .replace(/[œŒ]/g, "oe")
      .replace(/[æÆ]/g, "ae")
      // Decompose characters (separate base letter from accents)
      .normalize("NFD")
      // Remove combining diacritical marks
      .replace(/[\u0300-\u036f]/g, "")
      // Keep only basic letters
      .replace(/[^a-z]/g, "")
  );
}

/**
 * Removes duplicates from an array of strings after normalizing them
 */
export function removeDuplicatesNormalized(words: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const word of words) {
    const normalized = normalizeText(word);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      // Keep the original word (with accents) as the canonical version
      result.push(word);
    }
  }

  return result;
}
