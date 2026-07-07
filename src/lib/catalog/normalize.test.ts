import { describe, expect, it } from "vitest";

import {
  canonicalFlavourTag,
  canonicalFlavourTags,
  canonicalOrigin,
  canonicalProcess,
  cleanDisplay,
  dehyphenate,
  parseAltitudeRange,
  slugify,
} from "./normalize";

describe("dehyphenate", () => {
  it("joins a word split for display", () => {
    expect(dehyphenate("Gril-lee")).toBe("Grillee");
    expect(dehyphenate("Or-ange")).toBe("Orange");
    expect(dehyphenate("Su-cre")).toBe("Sucre");
  });

  it("preserves a real compound (second part capitalised)", () => {
    expect(dehyphenate("Mi-Sucre")).toBe("Mi-Sucre");
  });
});

describe("slugify", () => {
  it("is accent- and case-insensitive", () => {
    expect(slugify("Chocolat Noir")).toBe("chocolat-noir");
    expect(slugify("Crémeux")).toBe("cremeux");
  });
});

describe("canonicalOrigin", () => {
  it("maps a single French country to English", () => {
    expect(canonicalOrigin("Colombie")).toEqual({
      value: "Colombia",
      countries: ["Colombia"],
      isBlend: false,
    });
  });

  it("maps a blend and flags it", () => {
    const r = canonicalOrigin("Guatemala / Brésil");
    expect(r.countries).toEqual(["Guatemala", "Brazil"]);
    expect(r.value).toBe("Guatemala, Brazil");
    expect(r.isBlend).toBe(true);
  });

  it("splits comma-separated blends and de-hyphenates", () => {
    expect(canonicalOrigin("Colombie / In-donésie").countries).toEqual([
      "Colombia",
      "Indonesia",
    ]);
  });
});

describe("canonicalProcess", () => {
  it("maps single French processes", () => {
    expect(canonicalProcess("Lavé")).toBe("Washed");
    expect(canonicalProcess("Naturel")).toBe("Natural");
    expect(canonicalProcess("Miel Blanc")).toBe("White Honey");
  });

  it("prefers the longer match (pulped natural over natural)", () => {
    expect(canonicalProcess("Naturel Pulpé")).toBe("Pulped Natural");
  });

  it("maps blends and collapses repeats", () => {
    expect(canonicalProcess("Naturel / Lavé")).toBe("Natural / Washed");
    expect(canonicalProcess("Lavé / Lavé / Lavé")).toBe("Washed");
  });

  it("ignores trailing qualifiers", () => {
    expect(canonicalProcess("Entiérement Lavé")).toBe("Fully Washed");
    expect(canonicalProcess("Lavé, 24H De Fermentation À Sec")).toBe("Washed");
  });
});

describe("parseAltitudeRange", () => {
  it("returns equal bounds for a single altitude", () => {
    expect(parseAltitudeRange("1800M")).toEqual({ min: 1800, max: 1800 });
  });

  it("parses an explicit range", () => {
    expect(parseAltitudeRange("1200M - 2000M")).toEqual({
      min: 1200,
      max: 2000,
    });
  });

  it("spans the extremes of a blended range", () => {
    expect(parseAltitudeRange("800M - 1300M / 1200M - 1800M")).toEqual({
      min: 800,
      max: 1800,
    });
  });

  it("returns nulls when nothing parses", () => {
    expect(parseAltitudeRange("")).toEqual({ min: null, max: null });
  });
});

describe("canonicalFlavourTag", () => {
  it("maps accented and hyphenated notes to the same canonical tag", () => {
    expect(canonicalFlavourTag("Amande Grillée").name).toBe("Toasted Almond");
    expect(canonicalFlavourTag("Amande Gril-lée").name).toBe("Toasted Almond");
  });

  it("carries a category and slug", () => {
    expect(canonicalFlavourTag("Chocolat Noir")).toEqual({
      name: "Dark Chocolate",
      slug: "dark-chocolate",
      category: "chocolate",
    });
  });

  it("falls back to a cleaned title-cased tag for unknown notes", () => {
    const tag = canonicalFlavourTag("Quelque Chose");
    expect(tag.name).toBe("Quelque Chose");
    expect(tag.slug).toBe("quelque-chose");
    expect(tag.category).toBe("other");
  });
});

describe("canonicalFlavourTags", () => {
  it("de-duplicates by slug across differently-spelled notes", () => {
    const tags = canonicalFlavourTags(["Chocolaté", "Chocolat", "Cacao"]);
    expect(tags.map((t) => t.slug)).toEqual(["chocolate", "cocoa"]);
  });

  it("skips blank notes", () => {
    expect(canonicalFlavourTags(["Caramel", "  "]).map((t) => t.name)).toEqual([
      "Caramel",
    ]);
  });
});

describe("cleanDisplay", () => {
  it("de-hyphenates a word split for display and trims", () => {
    expect(cleanDisplay("Cat-uaí Jaune")).toBe("Catuaí Jaune");
    expect(cleanDisplay("Su-cre De Canne")).toBe("Sucre De Canne");
  });
});
