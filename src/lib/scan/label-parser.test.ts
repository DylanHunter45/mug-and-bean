import { describe, expect, it } from "vitest";

import { parseLabel, type KnownRoaster } from "./label-parser";

// Mirrors the seed collection's abbreviated layout (product name, roaster, then
// ORIG./VAR./PROC./ALT. anchored fields and a bullet notes line read as spaces).
const FRENCH_LABEL = [
  "JUICE TOWN",
  "TH3RD",
  "KOHI",
  "Kohi",
  "CACAO NOISETTES ORANGE",
  "ORIG. COLOMBIE, HUILA",
  "VAR. CATURRA, TABI",
  "PROC. LAVÉ",
  "ALT. 1200M - 2000M",
  "TORRÉFIÉ. SEM. 22 AVRIL, À PRÉVOST",
  "ORIGINE DU CAFÉ",
].join("\n");

const KNOWN: KnownRoaster[] = [
  { id: "kohi", name: "Kohi" },
  { id: "kittel", name: "Kittel" },
  { id: "rosso", name: "Rosso" },
];

describe("parseLabel - structured fields", () => {
  it("returns all six fields, each with a confidence band", () => {
    const parsed = parseLabel(FRENCH_LABEL);
    for (const field of [
      "roaster",
      "origin",
      "process",
      "varietal",
      "roastLevel",
      "tastingNotes",
    ] as const) {
      expect(parsed[field]).toHaveProperty("confidence");
      expect(["high", "medium", "low"]).toContain(parsed[field].confidence);
      expect(parsed[field]).toHaveProperty("needsReview");
    }
  });

  it("canonicalises the enumerable fields to English while keeping raw", () => {
    const parsed = parseLabel(FRENCH_LABEL);

    // Origin: raw stays the printed French country (+ region); value is the
    // canonical English country only (region is not folded in).
    expect(parsed.origin.raw).toMatch(/colombie/i);
    expect(parsed.origin.value).toBe("Colombia");

    // Process: "Lavé" -> "Washed".
    expect(parsed.process.raw).toMatch(/lav/i);
    expect(parsed.process.value).toBe("Washed");
  });

  it("extracts the varietal from the VAR. anchor as a proper noun", () => {
    const parsed = parseLabel(FRENCH_LABEL);
    expect(parsed.varietal.raw).toMatch(/caturra/i);
    expect(parsed.varietal.value).toBe("Caturra, Tabi");
    expect(parsed.varietal.confidence).toBe("high");
  });

  it("returns tasting notes as an array of canonical flavour tags", () => {
    const parsed = parseLabel(FRENCH_LABEL);
    expect(parsed.tastingNotes.raw).toMatch(/cacao/i);
    expect(parsed.tastingNotes.values).toEqual(
      expect.arrayContaining(["Cocoa", "Hazelnut", "Orange"]),
    );
    // The full tags carry a category for grouping in the UI.
    expect(parsed.tastingNotes.tags.every((t) => t.category)).toBe(true);
  });

  it("resolves a multi-word flavour to one canonical tag, not fragments", () => {
    const parsed = parseLabel("CHOCOLAT AU LAIT MASSEPAIN AMANDE GRILLÉE");
    expect(parsed.tastingNotes.values).toContain("Milk Chocolate");
    expect(parsed.tastingNotes.values).toContain("Marzipan");
    expect(parsed.tastingNotes.values).not.toContain("Chocolate");
  });
});

describe("parseLabel - roaster fuzzy matching", () => {
  it("snaps a noisy OCR roaster read to the known catalog entry", () => {
    // Every printed instance of the roaster is misread ("KOHl", lowercase L);
    // fuzzy matching should still resolve it to the catalog's "Kohi".
    const raw = FRENCH_LABEL.replace(/kohi/gi, "KOHl");
    const parsed = parseLabel(raw, { knownRoasters: KNOWN });
    expect(parsed.roaster.value).toBe("Kohi");
    expect(parsed.roaster.confidence).toBe("high");
    expect(parsed.roaster.match?.id).toBe("kohi");
  });

  it("keeps an unknown roaster as raw text (does not drop it)", () => {
    const raw = [
      "ONYX COFFEE LAB",
      "Roasted by Onyx Coffee Lab",
      "Origin: Ethiopia",
      "Process: Washed",
    ].join("\n");
    const parsed = parseLabel(raw, { knownRoasters: KNOWN });
    expect(parsed.roaster.match).toBeNull();
    expect(parsed.roaster.value).toMatch(/onyx coffee lab/i);
  });

  it("still returns the raw roaster when no catalog is supplied", () => {
    const parsed = parseLabel(FRENCH_LABEL);
    expect(parsed.roaster.value).toMatch(/kohi/i);
    expect(parsed.roaster.match).toBeNull();
  });
});

describe("parseLabel - flag, don't drop", () => {
  it("returns empty fields as null / low-confidence / needsReview", () => {
    const parsed = parseLabel("ACME BEANS CO");

    // No origin/process/varietal/roast signal at all.
    for (const field of [
      "origin",
      "process",
      "varietal",
      "roastLevel",
    ] as const) {
      expect(parsed[field].value).toBeNull();
      expect(parsed[field].confidence).toBe("low");
      expect(parsed[field].needsReview).toBe(true);
    }

    expect(parsed.tastingNotes.raw).toBeNull();
    expect(parsed.tastingNotes.values).toEqual([]);
    expect(parsed.tastingNotes.needsReview).toBe(true);
  });

  it("flags a low-confidence roaster guess for review", () => {
    // Only a bare product name - roaster is a weak last-resort guess.
    const parsed = parseLabel("ACME BEANS CO");
    expect(parsed.roaster.confidence).toBe("low");
    expect(parsed.roaster.needsReview).toBe(true);
  });

  it("does not flag a high-confidence anchored field", () => {
    const parsed = parseLabel(FRENCH_LABEL);
    expect(parsed.process.confidence).toBe("high");
    expect(parsed.process.needsReview).toBe(false);
  });
});

describe("parseLabel - roast level", () => {
  it("reads an explicit roast descriptor", () => {
    const parsed = parseLabel("Single origin\nTorréfaction foncée\nEthiopia");
    expect(parsed.roastLevel.value).toBe("Dark");
  });

  it("does not mistake 'chocolat noir' tasting note for a dark roast", () => {
    const parsed = parseLabel(
      "CHOCOLAT NOIR CARAMEL\nORIG. BRÉSIL\nPROC. NATUREL",
    );
    expect(parsed.roastLevel.value).toBeNull();
  });
});
