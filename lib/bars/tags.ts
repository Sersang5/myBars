import type { Rating, TagSummary } from "./types";

export function normalizeTagName(raw: string): string {
  const name = raw.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
  if (name === "") throw new Error("Tag name cannot be empty");
  return name;
}

/** Lowercases and strips accents; for matching only, never for storing. */
export function foldText(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function tryNormalize(raw: string): string | null {
  try {
    return normalizeTagName(raw);
  } catch {
    return null;
  }
}

/**
 * Tags to offer while typing: not already taken, matching the query ignoring case and accents.
 * Prefix matches come before inner matches; within each group, the most used first, ties by name.
 */
export function suggestTags(tags: TagSummary[], query: string, taken: string[], limit = 8): TagSummary[] {
  const takenSet = new Set(taken.map(tryNormalize));
  const q = foldText(query.trim());
  const rank = (t: TagSummary) => (q === "" || foldText(t.name).startsWith(q) ? 0 : 1);
  return tags
    .filter((t) => !takenSet.has(t.name) && foldText(t.name).includes(q))
    .sort((a, b) => rank(a) - rank(b) || b.barCount - a.barCount || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Adds the half-typed tag (if any and not already present) so saving never drops it. */
export function withDraftTag<T extends { name: string; rating: Rating | null }>(
  value: T[],
  draft: string,
): (T | { name: string; rating: null })[] {
  const name = tryNormalize(draft);
  if (name === null || value.some((t) => tryNormalize(t.name) === name)) return value;
  return [...value, { name, rating: null }];
}
