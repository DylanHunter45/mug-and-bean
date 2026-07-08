/**
 * Shared text primitives for the label parsers.
 *
 * These small, pure helpers are used by both the benchmark parser
 * (./parse.ts) and the production label-parsing service
 * (../scan/label-parser.ts). Keeping them in one place means the two parsers
 * de-accent, de-hyphenate, and slice anchored values identically - so a value
 * that scores against ground truth in the benchmark is extracted the same way
 * in production.
 *
 * All matching downstream is done on de-accented text so "LAVE" and "lave"
 * compare equal.
 */

/** Lower-case and strip diacritics so `LAVÉ` and `lave` compare equal. */
export function deaccent(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Join words split across a line break by a trailing hyphen
 * ("GRIL-\nLÉE" -> "GRILLÉE"). Labels hyphenate freely to fit narrow columns;
 * de-hyphenating before line-splitting keeps each note/word as one token so the
 * bullet/anchor extractors and the scorer see the real word.
 */
export function dehyphenate(raw: string): string {
  return raw.replace(/[­‐‑-]\s*\r?\n\s*/g, "");
}

/** Split into trimmed, non-empty lines. */
export function toLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Strip surrounding punctuation/whitespace and collapse internal runs. */
export function cleanup(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/^[\s:;,.\-|]+|[\s:;,.\-|]+$/g, "")
    .trim();
}

/** Title-case every word (naive - upper-cases the first letter of each token). */
export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** If `line` matches `anchor`, return the cleaned text that follows it. */
export function afterAnchor(line: string, anchor: RegExp): string | null {
  const m = line.match(anchor);
  if (!m || m.index === undefined) return null;
  const rest = cleanup(line.slice(m.index + m[0].length));
  return rest || null;
}
