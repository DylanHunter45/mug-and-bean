/**
 * Preliminary coffee-label parser: turns raw OCR text into the four structured
 * fields with a per-field confidence (0..1).
 *
 * Scope note: this is the BENCHMARK-grade parser - good enough to
 * measure how well each OCR vendor's text can be turned into fields, and shared
 * so the numbers are vendor-comparable. The production parser hardens
 * this with the full process/origin vocabularies, predictive autocomplete, and
 * fuzzy matching against the `roasters`/`coffees` catalog; keep the heuristics
 * here transparent and easy to reason about.
 *
 * Bilingual (EN + FR): the sample dataset is French, so the anchors,
 * abbreviations (`ORIG.`, `PROC.`, `VAR.`, `ALT.`), and vocabularies below cover
 * both languages. The parser matches on de-accented text so `LAVÉ` and `lave`
 * compare equal. Translation to canonical English is NOT done here - it is a
 * separate controlled-vocabulary step downstream.
 *
 * The parser never drops a field silently - a missing field comes back as
 * `{ value: null, confidence: 0 }` so the human-in-the-loop confirmation UI
 * can flag it. That "flag, don't drop" contract is load-bearing.
 */
import type { LabelField } from "./types";

export interface FieldExtraction {
  /** Extracted value, or `null` when nothing plausible was found. */
  value: string | null;
  /** Confidence the extraction is correct, 0..1. 0 when `value` is null. */
  confidence: number;
}

export type ParsedLabel = Record<LabelField, FieldExtraction>;

/**
 * Known wet/dry/honey processing methods (EN + FR), longest-first for greedy
 * matching. Compared de-accented, so list the natural spelling here.
 */
const PROCESS_KEYWORDS = [
  // English
  "carbonic maceration",
  "anaerobic natural",
  "anaerobic washed",
  "pulped natural",
  "double washed",
  "fully washed",
  "semi-washed",
  "wet-hulled",
  "giling basah",
  "thermal shock",
  "white honey",
  "yellow honey",
  "red honey",
  "black honey",
  "anaerobic",
  "lactic",
  "washed",
  "natural",
  "honey",
  // French
  "macération carbonique",
  "fermentation anaérobie",
  "anaérobie naturel",
  "anaérobie lavé",
  "dépulpé naturel",
  "miel blanc",
  "miel jaune",
  "miel rouge",
  "miel noir",
  "semi-lavé",
  "anaérobie",
  "dépulpé",
  "lavée",
  "lavé",
  "naturelle",
  "naturel",
  "lavage",
  "miel",
];

/**
 * A small origin gazetteer (EN + FR spellings) - enough for benchmark fallback
 * when the origin line is unlabelled. Matched de-accented.
 */
// FR spellings first: a French label printing "MEXIQUE" must resolve to
// "Mexique" (matching the French ground truth), not the English "Mexico" that
// may also appear in a logo. `findOrigin` returns the first listed hit.
const ORIGINS = [
  // French
  "éthiopie",
  "colombie",
  "brésil",
  "guatémala",
  "costa rica",
  "el salvador",
  "salvador",
  "honduras",
  "nicaragua",
  "pérou",
  "bolivie",
  "équateur",
  "mexique",
  "panama",
  "tanzanie",
  "ouganda",
  "yémen",
  "indonésie",
  "inde",
  "viêt nam",
  "chine",
  "birmanie",
  "thaïlande",
  "jamaïque",
  "congo",
  "république dominicaine",
  // English / shared
  "ethiopia",
  "kenya",
  "colombia",
  "brazil",
  "guatemala",
  "peru",
  "bolivia",
  "ecuador",
  "mexico",
  "rwanda",
  "burundi",
  "tanzania",
  "uganda",
  "yemen",
  "indonesia",
  "sumatra",
  "java",
  "sulawesi",
  "papua new guinea",
  "india",
  "vietnam",
  "china",
  "myanmar",
  "thailand",
  "jamaica",
];

/** Section-header phrases that follow an origin anchor but are NOT the origin. */
const ORIGIN_STOPWORDS = ["du cafe", "of coffee", "cafe", "coffee"];

const NONE: FieldExtraction = { value: null, confidence: 0 };

/** Bullet separators used by specialty labels to list tasting notes. */
const BULLET_SPLIT = /\s*[•·∙‣・▪◦‧|/]\s*/;
const BULLET_CHAR = /[•·∙‣・▪◦‧]/;

/** Lower-case and strip diacritics so `LAVÉ` and `lave` compare equal. */
function deaccent(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Join words split across a line break by a trailing hyphen
 * ("GRIL-\nLÉE" → "GRILLÉE"). Labels hyphenate freely to fit narrow columns;
 * de-hyphenating before line-splitting keeps each note/word as one token so the
 * bullet/anchor extractors and the scorer see the real word.
 */
function dehyphenate(raw: string): string {
  return raw.replace(/[­‐‑-]\s*\r?\n\s*/g, "");
}

function toLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Strip surrounding punctuation/whitespace and collapse internal runs. */
function cleanup(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/^[\s:;,.\---|]+|[\s:;,.\---|]+$/g, "")
    .trim();
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** If `line` matches `anchor`, return the cleaned text that follows it. */
function afterAnchor(line: string, anchor: RegExp): string | null {
  const m = line.match(anchor);
  if (!m || m.index === undefined) return null;
  const rest = cleanup(line.slice(m.index + m[0].length));
  return rest || null;
}

// --- Anchors (EN + FR, including the dataset's `ORIG.`/`PROC.` abbreviations).
const ROASTER_ANCHOR =
  /roast(?:ed by|ery|ers?)\b|torr[ée]fi[ée](?:\s+par)?\b|torr[ée]facteur\b|br[ûu]lerie\b/i;
// "coffee"/"roasters" (EN) are useful trade signals and do NOT match French
// "café"; the bare word "café" is deliberately excluded as too common on FR
// labels. Plural "roasters" matters - several roasters here are "X Roasters".
const ROASTER_TRADE =
  /\b(coffee|roaster(?:s|y)?|br[ûu]lerie|torr[ée]faction)\b/i;
// `ORIG.` (abbreviated layout) only - NOT bare "origine", which also appears in
// the footer "DÉCOUVRE L'ORIGINE SUR TH3RDWAVE" and would hijack the field.
// The labelled layout's country comes from the gazetteer scan instead.
const ORIGIN_ANCHOR = /\borig(?:\.|in\b|ine\b)/i;
// Match "PROCÉDÉ" (labelled layout) as a whole BEFORE "proc."/"process"
// (abbreviated layout), so it isn't sliced to the fragment "ÉDÉ". Accented
// letters are listed in both cases because JS `/i` doesn't fold them reliably
// without the `u` flag. "méthode" is excluded - it's the brew-icon row here.
const PROCESS_ANCHOR = /\b(?:proc[éÉeE]d[éÉeE]|process(?:ing)?|proc\.)/i;
const NOTES_ANCHOR =
  /(?:tasting notes|flavou?r notes|\bnotes(?:\s+de\s+d[ée]gustation)?|d[ée]gustation|ar[ôo]mes?|saveurs?|flavou?rs?)\b/i;

/** Field-header words used by the labelled layout (their value is elsewhere). */
const FIELD_HEADER =
  /^(?:pays|r[ée]gion|vari[ée]t[ée]|proc[ée]d[ée]|notes|orig(?:\.|ine?)?|var\.?|proc\.?|alt\.?|m[ée]thodes?)\b/i;

/**
 * Flavour vocabulary (de-accented, substring-matched) - enough to spot the
 * tasting-notes line on the abbreviated layout, where notes are printed with no
 * "notes" header and the bullets OCR as plain spaces. A line naming ≥2 of these
 * is the notes line. The production parser replaces this with the full `flavour_tags` vocab.
 */
const FLAVOUR_KEYWORDS = [
  "cacao",
  "chocolat",
  "caramel",
  "noisette",
  "noix",
  "amande",
  "orange",
  "pomme",
  "cerise",
  "miel",
  "sucre",
  "beurre",
  "vanille",
  "citron",
  "abricot",
  "prune",
  "mure",
  "framboise",
  "raisin",
  "agrume",
  "pomelo",
  "pacane",
  "nectarine",
  "sirop",
  "biscuit",
  "gaufre",
  "nutella",
  "sesame",
  "massepain",
  "truffle",
  "truffe",
  "canneberge",
  "fruit",
  "fleur",
  "guimauve",
  "mais",
  "tarte",
  "epice",
  "baies",
  "malique",
  "graham",
  "onctueux",
  "cremeux",
  "sirupeux",
  "fruite",
  "equilibr",
  "riche",
  "sable",
  "souffle",
  "canne",
  "lait",
  "grillee",
  "fumee",
  "noyau",
  "gateau",
  "citrique",
];

function flavourHits(line: string): number {
  const d = deaccent(line);
  return FLAVOUR_KEYWORDS.filter((k) => d.includes(k)).length;
}

/**
 * True for lines that are layout chrome rather than data: field headers, the
 * "Club de Café" / "TH3RD WAVE" collective branding, roast-city / footer lines,
 * and OCR crumbs too short to be a name. Used to keep the roaster guess off them.
 */
function isNoise(line: string): boolean {
  const d = deaccent(line);
  if (d.replace(/[^a-z]/g, "").length < 3) return true;
  if (FIELD_HEADER.test(line)) return true;
  if (
    /\b(th3rd|thlrd|third|therd|wave|club|lub|cafi|decouvre|methodes?|torrefi|torrefacteur|sundried|single)\b/.test(
      d,
    )
  )
    return true;
  if (/club de caf|lub de caf|de cafe|origine du caf|coffee origin/.test(d))
    return true;
  return false;
}

/** Normalised key for grouping repeated lines (the roaster repeats on a label). */
function normKey(s: string): string {
  return deaccent(s)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function containsKnownOrigin(s: string): boolean {
  const d = deaccent(s);
  return ORIGINS.some((o) => d.includes(deaccent(o)));
}

function findOrigin(raw: string): string | null {
  const d = deaccent(raw);
  for (const origin of ORIGINS) {
    if (d.includes(deaccent(origin))) return origin;
  }
  return null;
}

function extractRoaster(lines: string[]): FieldExtraction {
  // 1. An explicit "roasted by / torréfié par" anchor is the strongest signal.
  for (const line of lines) {
    const v = afterAnchor(line, ROASTER_ANCHOR);
    if (v) return { value: cleanup(v), confidence: 0.9 };
  }

  // Candidate lines = everything that isn't layout chrome.
  const candidates = lines.filter((l) => !isNoise(l)).map((l) => cleanup(l));

  // 2. The roaster name is typically printed more than once (logo + wordmark),
  // while the product name and crumbs appear once - so the most-repeated
  // candidate is usually the roaster. Ties break toward the later line, since
  // the big product name leads the label.
  const groups = new Map<
    string,
    { count: number; firstIndex: number; display: string }
  >();
  candidates.forEach((c, i) => {
    const key = normKey(c);
    if (!key) return;
    const g = groups.get(key);
    if (g) g.count++;
    else groups.set(key, { count: 1, firstIndex: i, display: c });
  });
  const repeated = [...groups.values()].filter((g) => g.count >= 2);
  if (repeated.length > 0) {
    repeated.sort((a, b) => b.count - a.count || b.firstIndex - a.firstIndex);
    return { value: repeated[0].display, confidence: 0.7 };
  }

  // 3. A candidate naming the trade ("X Coffee", "X Roasters").
  for (const c of candidates) {
    if (ROASTER_TRADE.test(c)) return { value: c, confidence: 0.6 };
  }

  // 4. Last resort: the first non-chrome line. On the labelled layout this is
  // usually the roaster; on the abbreviated layout it may be the product name -
  // A fuzzy match against the `roasters` catalog is the real fix.
  if (candidates.length > 0) return { value: candidates[0], confidence: 0.4 };
  return NONE;
}

function extractOrigin(lines: string[], raw: string): FieldExtraction {
  // 1. The abbreviated layout's "ORIG. COLOMBIE, HUILA" naming a known country.
  for (const line of lines) {
    const v = afterAnchor(line, ORIGIN_ANCHOR);
    if (v && containsKnownOrigin(v))
      return { value: cleanup(v), confidence: 0.9 };
  }
  // 2. Gazetteer scan (handles the labelled layout's "PAYS\nBRÉSIL", where the
  // country is on its own line). FR spellings are listed first so a French label
  // resolves to "Brésil"/"Mexique", matching the French ground truth.
  const found = findOrigin(raw);
  if (found) return { value: titleCase(found), confidence: 0.7 };
  // 3. Fall back to any anchored, non-header candidate (rare unknown origin).
  for (const line of lines) {
    const v = afterAnchor(line, ORIGIN_ANCHOR);
    if (v && !ORIGIN_STOPWORDS.includes(deaccent(cleanup(v)))) {
      return { value: cleanup(v), confidence: 0.5 };
    }
  }
  return NONE;
}

function extractProcess(lines: string[], raw: string): FieldExtraction {
  // 1. Anchored value on the same line ("PROC. LAVÉ", "PROCÉDÉ NATUREL/LAVÉ").
  for (const line of lines) {
    const v = afterAnchor(line, PROCESS_ANCHOR);
    if (v) return { value: cleanup(v), confidence: 0.9 };
  }
  // 2. Keyword scan over the whole label - also covers "PROCÉDÉ" alone on a line
  // (its value is elsewhere, and OCR often reorders the labelled layout).
  const d = deaccent(raw);
  for (const keyword of PROCESS_KEYWORDS) {
    if (d.includes(deaccent(keyword))) {
      return { value: titleCase(keyword), confidence: 0.7 };
    }
  }
  return NONE;
}

/** Lines that end a notes block on the labelled layout. */
function isNoteStop(line: string): boolean {
  return /m[ée]thodes?|d[ée]couvre|torr[ée]fi/i.test(line);
}

function extractTastingNotes(lines: string[]): FieldExtraction {
  // 1. An explicit "NOTES" / "Tasting Notes" anchor. On the labelled layout the
  // notes wrap across several lines after the header, so collect through to the
  // next block boundary; containment scoring tolerates any non-note crumbs.
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(NOTES_ANCHOR);
    if (!m || m.index === undefined) continue;
    const parts: string[] = [];
    const rest = cleanup(lines[i].slice(m.index + m[0].length));
    if (rest) parts.push(rest);
    for (let j = i + 1; j < lines.length && !isNoteStop(lines[j]); j++) {
      parts.push(cleanup(lines[j]));
    }
    const val = cleanup(parts.join(" "));
    if (val) return { value: val, confidence: 0.85 };
  }
  // 2. No header (abbreviated layout): the notes line names ≥2 flavours, or ≥1
  // alongside the specialty bullet convention. Bullets OCR as spaces, so we
  // detect by vocabulary, not punctuation.
  const noteLines = lines.filter(
    (l) => flavourHits(l) >= 2 || (flavourHits(l) >= 1 && BULLET_CHAR.test(l)),
  );
  if (noteLines.length > 0) {
    const val = cleanup(noteLines.join(" ").replace(BULLET_SPLIT, ", "));
    if (val) return { value: val, confidence: 0.6 };
  }
  return NONE;
}

/** Parse raw OCR text into the four structured label fields. */
export function parseLabel(rawText: string): ParsedLabel {
  const raw = dehyphenate(rawText);
  const lines = toLines(raw);
  return {
    roaster: extractRoaster(lines),
    origin: extractOrigin(lines, raw),
    process: extractProcess(lines, raw),
    tastingNotes: extractTastingNotes(lines),
  };
}
