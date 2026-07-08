/**
 * Trigram fuzzy matching for resolving noisy OCR text against known catalog
 * entities (roasters, origins).
 *
 * Mirrors Postgres `pg_trgm` semantics so an in-memory match here behaves like
 * the database-backed autocomplete the scan-confirmation UI uses: a string is
 * decomposed into its set of 3-grams (after `pg_trgm`'s convention of padding
 * with leading/trailing spaces and collapsing non-alphanumerics), and two
 * strings are compared by the similarity of their trigram sets.
 *
 * We use the Dice coefficient (2*|A∩B| / (|A|+|B|)) rather than `pg_trgm`'s
 * Jaccard - both rank the same way for our purpose, and Dice is a touch more
 * forgiving of length differences, which suits short roaster names. Kept pure
 * and framework-agnostic so the parser stays unit-testable without a database.
 */
import { deaccent } from "@/lib/ocr/text";

/**
 * Decompose a string into its trigram set the way `pg_trgm` does: de-accent,
 * lower-case, replace non-alphanumeric runs with a single space, pad each word
 * with two leading spaces and one trailing space, then take every 3-char
 * window. Padding lets short words and word starts contribute trigrams.
 */
export function trigrams(input: string): Set<string> {
  const normalized = deaccent(input)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!normalized) return new Set();

  const grams = new Set<string>();
  for (const word of normalized.split(" ")) {
    if (!word) continue;
    const padded = `  ${word} `;
    for (let i = 0; i + 3 <= padded.length; i++) {
      grams.add(padded.slice(i, i + 3));
    }
  }
  return grams;
}

/**
 * Dice similarity of two strings' trigram sets, in [0, 1]. Two empty strings
 * are treated as dissimilar (0) rather than identical - an empty extraction
 * should never "match" a catalog entry.
 */
export function similarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 || tb.size === 0) return 0;

  let intersection = 0;
  for (const gram of ta) {
    if (tb.has(gram)) intersection++;
  }
  return (2 * intersection) / (ta.size + tb.size);
}

/** A candidate matched from the catalog, with its similarity score. */
export interface FuzzyMatch<T> {
  candidate: T;
  score: number;
}

/**
 * Find the best-scoring candidate for `query` above `threshold`. `key` extracts
 * the comparable string from each candidate (defaults to identity for
 * `string[]`). Returns null when nothing clears the threshold, so the caller can
 * fall back to the raw extraction rather than force a bad match.
 */
export function bestMatch<T>(
  query: string,
  candidates: readonly T[],
  {
    threshold = 0.4,
    key = (c: T) => String(c),
  }: { threshold?: number; key?: (candidate: T) => string } = {},
): FuzzyMatch<T> | null {
  let best: FuzzyMatch<T> | null = null;
  for (const candidate of candidates) {
    const score = similarity(query, key(candidate));
    if (score > (best?.score ?? 0)) best = { candidate, score };
  }
  return best && best.score >= threshold ? best : null;
}
