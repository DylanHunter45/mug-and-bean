/**
 * Ground-truth scoring for the OCR benchmark.
 *
 * Compares a {@link ParsedLabel} against the known-correct answer for a label
 * and reports which fields matched, then aggregates across the dataset into the
 * per-field accuracy percentages the benchmark reports.
 *
 * Matching is deliberately forgiving but not sloppy: values are normalised
 * (lower-cased, de-accented, punctuation-stripped) before comparison, scalar
 * fields match on equality OR containment (so "Ethiopia" scores against
 * "Ethiopia, Yirgacheffe"), and tasting notes — a multi-value field — match
 * when at least half the expected notes are present.
 */
import type { ParsedLabel } from "./parse";
import { LABEL_FIELDS, type LabelField } from "./types";

/**
 * One row of the known-answer dataset (see benchmark/ocr/ground-truth.json).
 *
 * Values are recorded in the LABEL'S language (the sample dataset is French) so
 * the benchmark measures OCR + parse quality, not translation — `process` is
 * "Lavé", not "Washed". Translation to canonical English is a separate
 * downstream step.
 *
 * Only the four scored fields below are compared. The remaining fields are
 * RECORDED but ignored by the scorer — they capture the richer data real labels
 * carry, for later reuse. The schema gaps they expose (altitude as a range,
 * roast date) are a deferred follow-up migration.
 */
export interface GroundTruthLabel {
  /** Image filename under benchmark/ocr/labels/, e.g. "20260613_122954.jpg". */
  file: string;

  // --- Scored fields (in the label's language) ---
  /** Roaster name, e.g. "Kohi". */
  roaster: string;
  /** Origin — country (region may be appended), e.g. "Colombie". */
  origin: string;
  /** Processing method as printed, e.g. "Lavé". */
  process: string;
  /** Tasting notes; a match needs ≥50% present in the OCR output. */
  tastingNotes: string[];

  // --- Recorded but NOT scored (richer label data; optional) ---
  /** Coffee/product name, e.g. "Juice Town". */
  name?: string;
  /** Sub-national region, e.g. "Huila". */
  region?: string;
  /** Varietal(s), e.g. "Caturra, Tabi". */
  variety?: string;
  /** Altitude as printed — often a range, e.g. "1200M - 2000M". */
  altitude?: string;
  /** Recommended brew methods, if printed. */
  brewMethods?: string[];
  /** Roast date as printed, e.g. "Sem. 22 avril". */
  roastedDate?: string;
  /** QR-code target, if transcribed (usually a URL). */
  qrCode?: string;
}

/** Per-field pass/fail for a single label. */
export type LabelScore = Record<LabelField, boolean>;

/** Lower-case, strip diacritics and punctuation, collapse whitespace. */
export function normalize(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      // Join hyphenated splits BEFORE tokenizing, so a label's line-break
      // hyphenation ("Gril-lée", "Su-cre") matches the whole word the OCR reads
      // ("grillee", "sucre"). Covers soft hyphen + Unicode hyphens + hyphen-minus.
      .replace(/[­‐‑-]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ")
  );
}

function scalarMatch(expected: string, actual: string | null): boolean {
  if (!actual) return false;
  const e = normalize(expected);
  const a = normalize(actual);
  if (!e) return false;
  if (e === a) return true;
  // Containment either direction tolerates extra qualifiers on either side.
  return a.includes(e) || e.includes(a);
}

/** A note set matches when ≥ `threshold` of the expected notes are present. */
function notesMatch(
  expected: string[],
  actual: string | null,
  threshold = 0.5,
): boolean {
  if (expected.length === 0) return actual === null || normalize(actual) === "";
  if (!actual) return false;
  const haystack = normalize(actual);
  const hits = expected.filter((note) => {
    const n = normalize(note);
    return n.length > 0 && haystack.includes(n);
  }).length;
  return hits / expected.length >= threshold;
}

/** Score one parsed label against its ground truth, field by field. */
export function scoreLabel(
  parsed: ParsedLabel,
  truth: GroundTruthLabel,
): LabelScore {
  return {
    roaster: scalarMatch(truth.roaster, parsed.roaster.value),
    origin: scalarMatch(truth.origin, parsed.origin.value),
    process: scalarMatch(truth.process, parsed.process.value),
    tastingNotes: notesMatch(truth.tastingNotes, parsed.tastingNotes.value),
  };
}

export interface FieldAccuracy {
  correct: number;
  total: number;
  /** Fraction correct, 0..1. */
  accuracy: number;
}

export interface Aggregate {
  /** Number of labels scored. */
  count: number;
  /** Per-field correct/total/accuracy. */
  perField: Record<LabelField, FieldAccuracy>;
  /** Fraction of labels where ALL four fields matched (strict parse rate). */
  fullParseRate: number;
  /** Mean of the four per-field accuracies (the headline ≥85% target figure). */
  meanFieldAccuracy: number;
}

/** Roll up per-label scores into dataset-wide accuracy figures. */
export function aggregate(scores: LabelScore[]): Aggregate {
  const count = scores.length;
  const perField = {} as Record<LabelField, FieldAccuracy>;

  for (const field of LABEL_FIELDS) {
    const correct = scores.filter((s) => s[field]).length;
    perField[field] = {
      correct,
      total: count,
      accuracy: count === 0 ? 0 : correct / count,
    };
  }

  const fullParseCorrect = scores.filter((s) =>
    LABEL_FIELDS.every((f) => s[f]),
  ).length;

  const meanFieldAccuracy =
    LABEL_FIELDS.reduce((sum, f) => sum + perField[f].accuracy, 0) /
    LABEL_FIELDS.length;

  return {
    count,
    perField,
    fullParseRate: count === 0 ? 0 : fullParseCorrect / count,
    meanFieldAccuracy,
  };
}
