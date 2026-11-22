import type { Term } from './attributes.ts';

/** Lowercase and strip everything except letters and digits, so "t-SNE" matches "tsne". */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function searchKeys(term: Term): string[] {
  return [term.name, ...term.aliases].map(normalize);
}

/**
 * Autocomplete suggestions. Prefix matches rank above substring matches;
 * terms in `excludeIds` (already guessed) are left out.
 */
export function findMatches(
  terms: readonly Term[],
  query: string,
  excludeIds: ReadonlySet<string>,
  limit = 8,
): Term[] {
  const q = normalize(query);
  if (!q) return [];
  const scored: { term: Term; score: number }[] = [];
  for (const term of terms) {
    if (excludeIds.has(term.id)) continue;
    const keys = searchKeys(term);
    let score = -1;
    if (keys.some((k) => k === q)) score = 3;
    else if (keys[0].startsWith(q)) score = 2;
    else if (keys.some((k) => k.startsWith(q))) score = 1;
    else if (keys.some((k) => k.includes(q))) score = 0;
    if (score >= 0) scored.push({ term, score });
  }
  scored.sort((a, b) => b.score - a.score || a.term.name.localeCompare(b.term.name));
  return scored.slice(0, limit).map((s) => s.term);
}

/** The term whose name or alias exactly matches the text (after normalizing), if any. */
export function findExact(terms: readonly Term[], text: string): Term | undefined {
  const q = normalize(text);
  if (!q) return undefined;
  return terms.find((t) => searchKeys(t).includes(q));
}
