import { describe, expect, it } from "vitest";

import { bestMatch, similarity, trigrams } from "./fuzzy";

describe("trigrams", () => {
  it("pads words and de-accents so case and diacritics don't matter", () => {
    expect(trigrams("Café")).toEqual(trigrams("CAFE"));
  });

  it("is empty for text with no alphanumerics", () => {
    expect(trigrams("  ---  ").size).toBe(0);
  });

  it("splits on non-alphanumerics into per-word trigrams", () => {
    const grams = trigrams("Phil & Sebastian");
    // The ampersand is dropped; each word contributes padded trigrams.
    expect(grams.has("  p")).toBe(true);
    expect(grams.has("  s")).toBe(true);
  });
});

describe("similarity", () => {
  it("is 1 for identical (normalised) strings", () => {
    expect(similarity("Kohi", "kohi")).toBe(1);
  });

  it("is 0 when either side has no trigrams", () => {
    expect(similarity("", "Kohi")).toBe(0);
    expect(similarity("Kohi", "!!!")).toBe(0);
  });

  it("scores an OCR misread close to the true name", () => {
    // "KOHl" (lowercase L for I) should still be highly similar to "Kohi".
    expect(similarity("KOHl", "Kohi")).toBeGreaterThan(0.5);
  });

  it("scores unrelated names low", () => {
    expect(similarity("Kittel", "Rosso")).toBeLessThan(0.2);
  });
});

describe("bestMatch", () => {
  const roasters = [
    { id: "1", name: "Kohi" },
    { id: "2", name: "Kittel" },
    { id: "3", name: "Phil & Sebastian Coffee" },
  ];

  it("returns the closest candidate above the threshold", () => {
    const hit = bestMatch("KOHI", roasters, { key: (r) => r.name });
    expect(hit?.candidate.id).toBe("1");
    expect(hit?.score).toBeGreaterThan(0.4);
  });

  it("resolves a partial/noisy read to the right catalog entry", () => {
    const hit = bestMatch("PHIL & SEBASTIAN", roasters, { key: (r) => r.name });
    expect(hit?.candidate.id).toBe("3");
  });

  it("returns null when nothing clears the threshold (unknown entity)", () => {
    const hit = bestMatch("Onyx Coffee Lab", roasters, {
      key: (r) => r.name,
      threshold: 0.4,
    });
    expect(hit).toBeNull();
  });

  it("defaults the key to identity for plain string lists", () => {
    expect(bestMatch("kohi", ["Kohi", "Rosso"])?.candidate).toBe("Kohi");
  });
});
