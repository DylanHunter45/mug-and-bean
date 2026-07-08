/**
 * Intelligent label parsing service.
 *
 * Turns the raw OCR transcription of a coffee-bag label into the structured,
 * per-field result the scan-confirmation UI edits and then saves: `roaster`,
 * `origin`, `process`, `varietal`, `roastLevel`, and `tastingNotes`. This is the
 * PRODUCTION parser the benchmark parser (../ocr/parse.ts) deliberately left to
 * a later stage - it builds on that parser's proven raw extraction and adds:
 *
 *   - the two extra fields real labels carry (`varietal`, `roastLevel`),
 *   - a `high` / `medium` / `low` confidence band per field (plus a `needsReview`
 *     flag) so the UI can auto-focus what the human must check,
 *   - canonicalisation of the enumerable fields to English (via ../catalog/
 *     normalize) while keeping proper nouns as printed, and
 *   - fuzzy matching of the roaster against the known catalog so a noisy OCR
 *     read ("KOHl") snaps to the real roaster ("Kohi").
 *
 * Two contracts are load-bearing and inherited from the pipeline design:
 *   1. FLAG, DON'T DROP. A field with no signal comes back with `value: null`,
 *      `confidence: "low"`, `needsReview: true` - never silently omitted.
 *   2. UNKNOWNS SURVIVE AS RAW TEXT. A roaster/origin not in the catalog is
 *      returned as its cleaned printed string, not discarded.
 *
 * Framework-agnostic on purpose (no React/Next/Supabase imports) so a future
 * React Native client can reuse it. Catalog knowledge is INJECTED via
 * {@link ParseLabelOptions}, keeping the parser pure and unit-testable; the API
 * route is the only place that reaches the database.
 */
import {
  canonicalOrigin,
  canonicalProcess,
  extractFlavourTags,
  titleCase as canonicalTitleCase,
  type FlavourTag,
} from "@/lib/catalog/normalize";
import { parseLabel as parseRawLabel } from "@/lib/ocr/parse";
import { afterAnchor, deaccent, dehyphenate, toLines } from "@/lib/ocr/text";
import { bestMatch } from "@/lib/scan/fuzzy";

/** Confidence band the UI uses to decide what to auto-focus. */
export type Confidence = "high" | "medium" | "low";

/** A roaster from the shared catalog, supplied so the parser can fuzzy-match it. */
export interface KnownRoaster {
  id: string;
  name: string;
}

/** A catalog roaster the extracted text resolved to, for prefilling the form. */
export interface RoasterMatch {
  id: string;
  name: string;
  /** Trigram similarity of the OCR text to the catalog name, 0..1. */
  score: number;
}

/** One structured field: what was printed, the canonical value, and how sure. */
export interface ParsedField {
  /** The value as printed on the label (language-faithful), or null. */
  raw: string | null;
  /**
   * Canonical value for storage: English for the enumerable fields (origin,
   * process), the cleaned proper noun for the rest. Null when nothing was found.
   */
  value: string | null;
  confidence: Confidence;
  /** True when the field is empty or low-confidence - the UI auto-focuses these. */
  needsReview: boolean;
}

/** The roaster field additionally carries its catalog match, when one was found. */
export interface RoasterField extends ParsedField {
  match: RoasterMatch | null;
}

/** Tasting notes are multi-valued: the raw line plus canonical flavour tags. */
export interface TastingNotesField {
  /** The notes as printed (run-on string), or null. */
  raw: string | null;
  /** Canonical flavour-tag names, de-duplicated. */
  values: string[];
  /** Full canonical tags (name + slug + category) for saving/rendering. */
  tags: FlavourTag[];
  confidence: Confidence;
  needsReview: boolean;
}

/** The complete parse of one label. */
export interface ParsedLabel {
  roaster: RoasterField;
  origin: ParsedField;
  process: ParsedField;
  varietal: ParsedField;
  roastLevel: ParsedField;
  tastingNotes: TastingNotesField;
}

export interface ParseLabelOptions {
  /**
   * Known roasters from the catalog. When supplied, the extracted roaster is
   * fuzzy-matched against them so OCR noise resolves to the real entity. Omit to
   * skip matching (the raw extraction is still returned).
   */
  knownRoasters?: readonly KnownRoaster[];
}

/** Map the benchmark parser's numeric confidence (0..1) to a band. */
function band(score: number): Confidence {
  if (score >= 0.8) return "high";
  if (score >= 0.6) return "medium";
  return "low";
}

/** A field needs human review when it is empty or the parser is unsure. */
function needsReview(value: string | null, confidence: Confidence): boolean {
  return value === null || confidence === "low";
}

// --- Varietal --------------------------------------------------------------
// The dataset prints "VAR. CATURRA, TABI"; also cover the spelled-out forms.
const VARIETAL_ANCHOR =
  /\bvar(?:\.|i[ée]t[ée]s?\b|iet(?:y|ies|als?)\b)|\bcultivars?\b/i;

/**
 * Tidy an as-printed proper noun for storage: a label often screams a varietal
 * in ALL CAPS ("CATURRA, TABI"), which we Title-case ("Caturra, Tabi"). Words
 * that carry their own casing are left alone - a token with digits or a lower
 * case letter ("SL28", "Catuaí", "F1") keeps its printed form.
 */
function tidyProperNoun(raw: string): string {
  return canonicalTitleCase(raw).replace(/[\p{L}\p{N}]+/gu, (token) => {
    // Leave tokens that carry their own casing: anything with a digit ("SL28")
    // or an existing lower-case letter ("Catuaí", "Jaune"). Only fold a word
    // that is entirely upper-case.
    if (/\d/.test(token) || /\p{Ll}/u.test(token)) return token;
    return token.charAt(0) + token.slice(1).toLowerCase();
  });
}

function extractVarietal(lines: string[]): ParsedField {
  for (const line of lines) {
    const v = afterAnchor(line, VARIETAL_ANCHOR);
    if (v) {
      // Varietal is a proper noun - keep it as printed, just tidied.
      return {
        raw: v,
        value: tidyProperNoun(v),
        confidence: "high",
        needsReview: false,
      };
    }
  }
  return { raw: null, value: null, confidence: "low", needsReview: true };
}

// --- Roast level -----------------------------------------------------------
// Whole-word roast descriptors (EN + FR), longest-first. Deliberately narrow:
// ambiguous words like "noir" are excluded because they appear in tasting notes
// ("chocolat noir"), which would produce false "Dark" reads. Specialty labels
// often omit roast level entirely - a null here is correct and gets flagged.
// Patterns are matched against DE-ACCENTED, lower-cased text, so they are
// written in ASCII ("foncee", not "foncée").
const ROAST_RULES: Array<[RegExp, string]> = [
  [
    /\bmi[\s-]?noir\b|\bmedium[\s-]?dark\b|\bambree?\s+foncee?\b/,
    "Medium-Dark",
  ],
  [/\bmedium[\s-]?light\b|\bmi[\s-]?clair\b/, "Medium-Light"],
  [/\bfoncee?\b|\bdark\s+roast\b|\bespresso\s+roast\b/, "Dark"],
  [/\bmoyen(?:ne)?\b|\bmedium\s+roast\b|\bambree?\b/, "Medium"],
  [/\bclair\b|\blegere?\b|\blight\s+roast\b|\bblond\b/, "Light"],
];

function extractRoastLevel(raw: string): ParsedField {
  const d = deaccent(raw);
  for (const [pattern, level] of ROAST_RULES) {
    if (pattern.test(d)) {
      return {
        raw: level,
        value: level,
        confidence: "medium",
        needsReview: false,
      };
    }
  }
  return { raw: null, value: null, confidence: "low", needsReview: true };
}

// --- Roaster (with fuzzy catalog matching) ---------------------------------
// Below this trigram similarity a catalog hit is treated as coincidence, and we
// keep the raw extraction instead - so an unknown roaster survives as raw text.
const ROASTER_MATCH_THRESHOLD = 0.4;

function resolveRoaster(
  rawGuess: string | null,
  rawScore: number,
  lines: string[],
  knownRoasters: readonly KnownRoaster[] | undefined,
): RoasterField {
  const cleanedGuess = rawGuess ? canonicalTitleCase(rawGuess) : null;

  if (knownRoasters && knownRoasters.length > 0) {
    // Score every catalog roaster against the primary guess AND each label line
    // (the true roaster name is sometimes on a line the raw heuristic passed
    // over), then take the single best (roaster, text) pairing.
    const candidateTexts = [rawGuess, ...lines].filter((t): t is string =>
      Boolean(t && t.trim()),
    );
    let best: RoasterMatch | null = null;
    for (const roaster of knownRoasters) {
      const hit = bestMatch(roaster.name, candidateTexts, {
        threshold: ROASTER_MATCH_THRESHOLD,
        key: (t) => t,
      });
      if (hit && hit.score > (best?.score ?? 0)) {
        best = { id: roaster.id, name: roaster.name, score: hit.score };
      }
    }
    if (best) {
      return {
        raw: cleanedGuess,
        value: best.name,
        confidence: "high",
        needsReview: false,
        match: best,
      };
    }
  }

  // No catalog match (or no catalog supplied): keep the raw guess as-is.
  const confidence = cleanedGuess ? band(rawScore) : "low";
  return {
    raw: cleanedGuess,
    value: cleanedGuess,
    confidence,
    needsReview: needsReview(cleanedGuess, confidence),
    match: null,
  };
}

// --- Origin ----------------------------------------------------------------

/**
 * Canonicalise the printed origin to its country/countries in English. The label
 * prints "COUNTRY, REGION" (comma) and blends as "A / B" (slash); we keep only
 * the country segment of each so the origin field is the country and the region
 * is not folded into it. Unknown countries survive as a title-cased fallback.
 */
function canonicaliseOriginCountry(raw: string): string {
  const countryOnly = raw
    .split("/")
    .map((seg) => seg.split(",")[0].trim())
    .filter(Boolean)
    .join(" / ");
  return canonicalOrigin(countryOnly).value || canonicalTitleCase(raw);
}

/** Parse raw OCR text into the six structured, confidence-scored label fields. */
export function parseLabel(
  rawText: string,
  options: ParseLabelOptions = {},
): ParsedLabel {
  const base = parseRawLabel(rawText);
  const lines = toLines(dehyphenate(rawText));

  const roaster = resolveRoaster(
    base.roaster.value,
    base.roaster.confidence,
    lines,
    options.knownRoasters,
  );

  const originConfidence = base.origin.value
    ? band(base.origin.confidence)
    : "low";
  const origin: ParsedField = {
    raw: base.origin.value,
    value: base.origin.value
      ? canonicaliseOriginCountry(base.origin.value)
      : null,
    confidence: originConfidence,
    needsReview: needsReview(base.origin.value, originConfidence),
  };

  const processConfidence = base.process.value
    ? band(base.process.confidence)
    : "low";
  const process: ParsedField = {
    raw: base.process.value,
    value: base.process.value ? canonicalProcess(base.process.value) : null,
    confidence: processConfidence,
    needsReview: needsReview(base.process.value, processConfidence),
  };

  const varietal = extractVarietal(lines);
  const roastLevel = extractRoastLevel(rawText);

  const noteTags = base.tastingNotes.value
    ? extractFlavourTags(base.tastingNotes.value)
    : [];
  const notesConfidence = base.tastingNotes.value
    ? band(base.tastingNotes.confidence)
    : "low";
  const tastingNotes: TastingNotesField = {
    raw: base.tastingNotes.value,
    values: noteTags.map((t) => t.name),
    tags: noteTags,
    confidence: notesConfidence,
    needsReview: needsReview(base.tastingNotes.value, notesConfidence),
  };

  return { roaster, origin, process, varietal, roastLevel, tastingNotes };
}
