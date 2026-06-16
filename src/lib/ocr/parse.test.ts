import { describe, expect, it } from "vitest";
import { parseLabel } from "./parse";

describe("parseLabel", () => {
  it("extracts all four fields from a well-labelled bag with high confidence", () => {
    const raw = [
      "ONYX COFFEE LAB",
      "Roasted by Onyx Coffee Lab",
      "Origin: Ethiopia, Yirgacheffe",
      "Process: Washed",
      "Tasting Notes: Blueberry, Dark Chocolate, Cherry",
    ].join("\n");

    const parsed = parseLabel(raw);

    expect(parsed.roaster.value).toMatch(/onyx coffee lab/i);
    expect(parsed.roaster.confidence).toBe(0.9);
    expect(parsed.origin.value).toMatch(/ethiopia/i);
    expect(parsed.origin.confidence).toBe(0.9);
    expect(parsed.process.value).toMatch(/washed/i);
    expect(parsed.process.confidence).toBe(0.9);
    expect(parsed.tastingNotes.value).toMatch(/blueberry/i);
    expect(parsed.tastingNotes.confidence).toBe(0.85);
  });

  it("falls back to keyword/gazetteer matches with lower confidence when unlabelled", () => {
    const raw = [
      "BLUE BOTTLE COFFEE",
      "Three Africas",
      "Ethiopia",
      "Natural",
      "Notes of strawberry and chocolate",
    ].join("\n");

    const parsed = parseLabel(raw);

    expect(parsed.roaster.value).toMatch(/blue bottle/i);
    expect(parsed.roaster.confidence).toBe(0.6);
    expect(parsed.origin.value).toMatch(/ethiopia/i);
    expect(parsed.origin.confidence).toBe(0.7);
    expect(parsed.process.value).toMatch(/natural/i);
    expect(parsed.process.confidence).toBe(0.7);
    expect(parsed.tastingNotes.value).toMatch(/strawberry/i);
  });

  it("flags missing fields as null rather than dropping them", () => {
    const parsed = parseLabel("ACME BEANS CO");

    // Roaster is always guessed from the first line as a last resort.
    expect(parsed.roaster.value).toMatch(/acme beans/i);
    expect(parsed.roaster.confidence).toBe(0.4);

    // The rest have no signal and must come back null / zero-confidence.
    expect(parsed.origin).toEqual({ value: null, confidence: 0 });
    expect(parsed.process).toEqual({ value: null, confidence: 0 });
    expect(parsed.tastingNotes).toEqual({ value: null, confidence: 0 });
  });

  it("prefers the longest matching process keyword", () => {
    const parsed = parseLabel("A natural anaerobic lot from the farm");
    expect(parsed.process.value).toMatch(/anaerobic/i);
  });

  it("extracts fields from a French label using FR anchors and abbreviations", () => {
    // Mirrors the seed dataset's layout (product name first, then roaster).
    const raw = [
      "JUICE TOWN",
      "KOHI",
      "ORIG. COLOMBIE, HUILA",
      "VAR. CATURRA, TABI",
      "PROC. LAVÉ",
      "ALT. 1200M - 2000M",
      "CACAO • NOISETTES • ORANGE",
      "ORIGINE DU CAFÉ",
      "TORRÉFIÉ : SEM. 22 AVRIL, À PRÉVOST",
    ].join("\n");

    const parsed = parseLabel(raw);

    // Origin: the "ORIG." abbreviation anchor wins over the "ORIGINE DU CAFÉ"
    // section header because the captured text names a known origin.
    expect(parsed.origin.value).toMatch(/colombie/i);
    expect(parsed.origin.confidence).toBe(0.9);

    // Process: "PROC. LAVÉ" anchored, de-accented match.
    expect(parsed.process.value).toMatch(/lav/i);
    expect(parsed.process.confidence).toBe(0.9);

    // Tasting notes: bullet-separated line, no explicit anchor.
    expect(parsed.tastingNotes.value).toMatch(/cacao/i);
    expect(parsed.tastingNotes.value).toMatch(/noisettes/i);
    expect(parsed.tastingNotes.confidence).toBe(0.6);
  });

  it("matches French process keywords de-accented when unanchored", () => {
    const parsed = parseLabel("Café d'Éthiopie, lavé, récolte 2025");
    expect(parsed.process.value).toMatch(/lav/i);
    expect(parsed.origin.value).toMatch(/thiopie/i);
  });

  it("rejoins words hyphenated across a line break", () => {
    // Narrow label columns wrap a note mid-word with a trailing hyphen; the
    // parser should heal "GRIL-\nLÉE" into one token before extracting notes.
    const raw = ["CACAO • NOISETTES • AMANDE GRIL-", "LÉE"].join("\n");

    const parsed = parseLabel(raw);

    // Value keeps its accents (the scorer de-accents at compare time); the point
    // is the word is rejoined, not split across the hyphen.
    expect(parsed.tastingNotes.value).toMatch(/grillée/i);
    expect(parsed.tastingNotes.value).not.toMatch(/gril-/i);
  });
});
