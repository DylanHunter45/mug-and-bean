/**
 * Catalog normalisation: turn the as-printed values from a coffee-bag label into
 * the canonical shape the shared catalog stores.
 *
 * The founder's physical collection is French (Quebec specialty roasters), and
 * the label text is deliberately kept in its original language wherever it is a
 * proper noun (coffee name, region, varietal, roaster). But a handful of fields
 * are ENUMERABLE and must be canonical so the catalog can be grouped, filtered,
 * and searched consistently regardless of the label's language:
 *
 *   - origin country  -> canonical English country name(s)
 *   - process method  -> canonical English process name(s)
 *   - flavour tags     -> a canonical English controlled vocabulary
 *
 * This is the "translation to canonical English" step that the OCR benchmark
 * parser intentionally leaves out: it reads what is printed (French), and the
 * mapping to a controlled vocabulary happens here, downstream. Keeping these
 * maps in framework-agnostic src/lib means the scan-confirmation flow can reuse
 * the exact same canonicalisation later.
 *
 * All matching is done de-accented and de-hyphenated, because label text is
 * accented ("Lave" vs "Lave") and OCR/print wraps words with hyphens
 * ("Gril-lee" -> "Grillee"). Anything not in a map falls back to a cleaned,
 * title-cased version of the input so no data is silently dropped.
 */

/** Lower-case and strip diacritics so "LAVE" and "lave" compare equal. */
export function deaccent(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Remove a hyphen that splits a single word for display ("Gril-lee" ->
 * "Grillee", "Or-ange" -> "Orange"), while preserving a hyphen that joins a real
 * compound ("Mi-Sucre" stays). Heuristic: a word-splitting hyphen sits between a
 * letter and a LOWER-case letter; a compound's second part is typically
 * capitalised on these labels.
 */
export function dehyphenate(s: string): string {
  return s.replace(/(\p{L})-(\p{Ll})/gu, "$1$2");
}

/** URL/id-safe slug from any label text. */
export function slugify(s: string): string {
  return deaccent(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Collapse whitespace and trim leading/trailing punctuation. */
function clean(s: string): string {
  return dehyphenate(s)
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:.]+|[\s,;:.]+$/g, "")
    .trim();
}

/** Title-case a cleaned string, used as the fallback for unmapped values. */
export function titleCase(s: string): string {
  return clean(s).replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/** Aggressive lookup key: de-accented, hyphens removed, single-spaced. */
function key(s: string): string {
  return deaccent(s)
    .replace(/-/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// --- Origin countries ------------------------------------------------------
// Keyed on the de-accented spelling; French first since that is what the labels
// print. Covers every origin in the founder's collection.
const ORIGIN_MAP: Record<string, string> = {
  colombie: "Colombia",
  colombia: "Colombia",
  bresil: "Brazil",
  brazil: "Brazil",
  guatemala: "Guatemala",
  "costa rica": "Costa Rica",
  "el salvador": "El Salvador",
  salvador: "El Salvador",
  mexique: "Mexico",
  mexico: "Mexico",
  nicaragua: "Nicaragua",
  perou: "Peru",
  peru: "Peru",
  ethiopie: "Ethiopia",
  ethiopia: "Ethiopia",
  honduras: "Honduras",
  indonesie: "Indonesia",
  indonesia: "Indonesia",
};

/**
 * Canonicalise an origin string that may name a blend of countries
 * ("Guatemala / Bresil", "Ethiopie, Bresil, Mexico"). Returns the unique
 * canonical country names joined with ", " and whether it is a blend.
 */
export function canonicalOrigin(raw: string): {
  value: string;
  countries: string[];
  isBlend: boolean;
} {
  const parts = raw
    .split(/[/,]/)
    .map((p) => clean(p))
    .filter(Boolean);
  const countries: string[] = [];
  for (const part of parts) {
    const mapped = ORIGIN_MAP[key(part)] ?? titleCase(part);
    if (mapped && !countries.includes(mapped)) countries.push(mapped);
  }
  return {
    value: countries.join(", "),
    countries,
    isBlend: countries.length > 1,
  };
}

// --- Process methods -------------------------------------------------------
// Longest-first so "naturel pulpe" wins over "naturel". Keys are de-accented and
// hyphen-free; a process part is matched by longest-prefix containment.
const PROCESS_RULES: Array<[string, string]> = [
  ["entierement lave", "Fully Washed"],
  ["naturel pulpe", "Pulped Natural"],
  ["depulpe naturel", "Pulped Natural"],
  ["naturel pulpee", "Pulped Natural"],
  ["seche au soleil", "Sun-Dried"],
  ["miel blanc", "White Honey"],
  ["miel jaune", "Yellow Honey"],
  ["miel rouge", "Red Honey"],
  ["miel noir", "Black Honey"],
  ["sundried", "Sun-Dried"],
  ["naturelle", "Natural"],
  ["naturel", "Natural"],
  ["lavage", "Washed"],
  ["lavee", "Washed"],
  ["lave", "Washed"],
  ["miel", "Honey"],
];

function canonicalProcessPart(part: string): string {
  const k = key(part);
  for (const [needle, english] of PROCESS_RULES) {
    if (k.includes(needle)) return english;
  }
  return titleCase(part);
}

/**
 * Canonicalise a process string that may name a blend ("Naturel / Lave").
 * Repeated parts collapse ("Lave / Lave" -> "Washed").
 */
export function canonicalProcess(raw: string): string {
  const parts = raw
    .split("/")
    .map((p) => clean(p))
    .filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    const english = canonicalProcessPart(part);
    if (english && !out.includes(english)) out.push(english);
  }
  return out.join(" / ");
}

// --- Altitude --------------------------------------------------------------

/**
 * Parse a printed altitude into a metre range. Handles single values ("1800M"),
 * ranges ("1200M - 2000M"), and multi-origin blends ("1750M / 1300M") by taking
 * the overall lowest and highest figure. Returns nulls when nothing parses.
 */
export function parseAltitudeRange(raw: string): {
  min: number | null;
  max: number | null;
} {
  const nums = (raw.match(/\d{3,4}/g) ?? []).map(Number);
  if (nums.length === 0) return { min: null, max: null };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

// --- Flavour vocabulary ----------------------------------------------------

export interface FlavourTag {
  name: string;
  slug: string;
  category: string;
}

/**
 * Controlled flavour vocabulary: de-accented, hyphen-free French note -> the
 * canonical English tag and its category. The category set is small and
 * intentional (chocolate / nutty / fruity / sweet / floral / spice / other /
 * body) so tags group cleanly in the UI.
 */
const FLAVOUR_RULES: Record<string, { name: string; category: string }> = {
  // chocolate
  cacao: { name: "Cocoa", category: "chocolate" },
  chocolat: { name: "Chocolate", category: "chocolate" },
  chocolate: { name: "Chocolate", category: "chocolate" },
  "chocolat noir": { name: "Dark Chocolate", category: "chocolate" },
  "chocolat au lait": { name: "Milk Chocolate", category: "chocolate" },
  "lait au chocolat": { name: "Milk Chocolate", category: "chocolate" },
  "chocolat malte": { name: "Malted Chocolate", category: "chocolate" },
  "chocolat misucre": { name: "Semisweet Chocolate", category: "chocolate" },
  "truffle au chocolat": { name: "Chocolate Truffle", category: "chocolate" },
  nutella: { name: "Chocolate Hazelnut", category: "chocolate" },
  // nutty
  noisette: { name: "Hazelnut", category: "nutty" },
  noisettes: { name: "Hazelnut", category: "nutty" },
  noix: { name: "Walnut", category: "nutty" },
  "noix de grenoble": { name: "Walnut", category: "nutty" },
  "noix de cajou": { name: "Cashew", category: "nutty" },
  "noix roties": { name: "Roasted Nuts", category: "nutty" },
  amande: { name: "Almond", category: "nutty" },
  "amande grillee": { name: "Toasted Almond", category: "nutty" },
  "amandes fumees": { name: "Smoked Almond", category: "nutty" },
  "beurre damande": { name: "Almond Butter", category: "nutty" },
  "beurre darachide": { name: "Peanut Butter", category: "nutty" },
  massepain: { name: "Marzipan", category: "nutty" },
  pacane: { name: "Pecan", category: "nutty" },
  sesame: { name: "Sesame", category: "nutty" },
  // fruity
  orange: { name: "Orange", category: "fruity" },
  agrumes: { name: "Citrus", category: "fruity" },
  citron: { name: "Lemon", category: "fruity" },
  pomelo: { name: "Grapefruit", category: "fruity" },
  pomme: { name: "Apple", category: "fruity" },
  "pomme verte": { name: "Green Apple", category: "fruity" },
  "pomme rouge": { name: "Red Apple", category: "fruity" },
  cerise: { name: "Cherry", category: "fruity" },
  "cerise noire": { name: "Black Cherry", category: "fruity" },
  abricot: { name: "Apricot", category: "fruity" },
  nectarine: { name: "Nectarine", category: "fruity" },
  prune: { name: "Plum", category: "fruity" },
  mure: { name: "Blackberry", category: "fruity" },
  framboise: { name: "Raspberry", category: "fruity" },
  canneberge: { name: "Cranberry", category: "fruity" },
  "baies rouges": { name: "Red Berries", category: "fruity" },
  "fruits rouges": { name: "Red Berries", category: "fruity" },
  "fruits seches": { name: "Dried Fruit", category: "fruity" },
  "raisins secs": { name: "Raisin", category: "fruity" },
  "fruit a noyau": { name: "Stone Fruit", category: "fruity" },
  fruite: { name: "Fruity", category: "fruity" },
  // sweet
  caramel: { name: "Caramel", category: "sweet" },
  "caramel au beurre": { name: "Butterscotch", category: "sweet" },
  "caramel sale": { name: "Salted Caramel", category: "sweet" },
  miel: { name: "Honey", category: "sweet" },
  "gateau au miel": { name: "Honey", category: "sweet" },
  "canne a sucre": { name: "Cane Sugar", category: "sweet" },
  "sucre de canne": { name: "Cane Sugar", category: "sweet" },
  "sucre brun": { name: "Brown Sugar", category: "sweet" },
  sucre: { name: "Sweet", category: "sweet" },
  vanille: { name: "Vanilla", category: "sweet" },
  "sirop derable": { name: "Maple Syrup", category: "sweet" },
  gaufre: { name: "Waffle", category: "sweet" },
  "tarte sablee": { name: "Shortbread", category: "sweet" },
  "biscuit graham": { name: "Graham Cracker", category: "sweet" },
  "guimauves grillees": { name: "Toasted Marshmallow", category: "sweet" },
  // floral
  "fleur doranger": { name: "Orange Blossom", category: "floral" },
  // spice
  epices: { name: "Spices", category: "spice" },
  // other / body
  "the noir": { name: "Black Tea", category: "other" },
  "mais souffle": { name: "Popcorn", category: "other" },
  "acidite malique": { name: "Malic Acidity", category: "other" },
  citrique: { name: "Citric Acidity", category: "other" },
  cremeux: { name: "Creamy", category: "body" },
  onctueux: { name: "Creamy", category: "body" },
  sirupeux: { name: "Syrupy", category: "body" },
  beurre: { name: "Butter", category: "body" },
  riche: { name: "Rich", category: "body" },
  equilibre: { name: "Balanced", category: "body" },
  equilbre: { name: "Balanced", category: "body" },
};

/** Map a single printed tasting note to its canonical flavour tag. */
export function canonicalFlavourTag(note: string): FlavourTag {
  const rule = FLAVOUR_RULES[key(note)];
  const name = rule?.name ?? titleCase(note);
  return {
    name,
    slug: slugify(name),
    category: rule?.category ?? "other",
  };
}

/**
 * Map a list of printed notes to a de-duplicated list of canonical flavour tags
 * (deduped by slug, order preserved).
 */
export function canonicalFlavourTags(notes: string[]): FlavourTag[] {
  const seen = new Set<string>();
  const out: FlavourTag[] = [];
  for (const note of notes) {
    if (!note.trim()) continue;
    const tag = canonicalFlavourTag(note);
    if (seen.has(tag.slug)) continue;
    seen.add(tag.slug);
    out.push(tag);
  }
  return out;
}

/** Clean a proper-noun field (name, region, varietal) for display storage. */
export function cleanDisplay(raw: string): string {
  return clean(raw);
}
