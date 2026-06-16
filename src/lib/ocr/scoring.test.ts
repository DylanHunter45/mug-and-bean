import { describe, expect, it } from "vitest";
import type { ParsedLabel } from "./parse";
import {
  aggregate,
  normalize,
  scoreLabel,
  type GroundTruthLabel,
  type LabelScore,
} from "./scoring";

function parsed(
  fields: Partial<Record<keyof ParsedLabel, string | null>>,
): ParsedLabel {
  const field = (value: string | null = null) => ({
    value,
    confidence: value ? 0.9 : 0,
  });
  return {
    roaster: field(fields.roaster),
    origin: field(fields.origin),
    process: field(fields.process),
    tastingNotes: field(fields.tastingNotes),
  };
}

const truth: GroundTruthLabel = {
  file: "001.jpg",
  roaster: "Onyx Coffee Lab",
  origin: "Ethiopia",
  process: "Washed",
  tastingNotes: ["blueberry", "dark chocolate", "cherry"],
};

describe("normalize", () => {
  it("lower-cases, strips accents and punctuation, collapses whitespace", () => {
    expect(normalize("  Café   Crème! ")).toBe("cafe creme");
  });

  it("joins line-break hyphenation so split words match the whole word", () => {
    // Ground truth records the label's hyphen artifact; OCR reads the real word.
    expect(normalize("Gril-lée")).toBe("grillee");
    expect(normalize("Su-cre De Canne")).toBe("sucre de canne");
  });
});

describe("scoreLabel", () => {
  it("matches scalars by containment and notes by ≥50% overlap", () => {
    const score = scoreLabel(
      parsed({
        roaster: "Onyx Coffee Lab",
        origin: "Ethiopia, Yirgacheffe", // extra qualifier still matches
        process: "washed", // case-insensitive
        tastingNotes: "Blueberry and dark chocolate", // 2/3 notes present
      }),
      truth,
    );
    expect(score).toEqual({
      roaster: true,
      origin: true,
      process: true,
      tastingNotes: true,
    });
  });

  it("fails fields that are missing or wrong", () => {
    const score = scoreLabel(
      parsed({
        roaster: null,
        origin: "Kenya",
        process: "Natural",
        tastingNotes: "Lemon", // 0/3 notes present
      }),
      truth,
    );
    expect(score).toEqual({
      roaster: false,
      origin: false,
      process: false,
      tastingNotes: false,
    });
  });
});

describe("aggregate", () => {
  it("computes per-field accuracy, strict parse rate, and mean accuracy", () => {
    const scores: LabelScore[] = [
      { roaster: true, origin: true, process: true, tastingNotes: true },
      { roaster: true, origin: true, process: false, tastingNotes: false },
    ];
    const agg = aggregate(scores);

    expect(agg.count).toBe(2);
    expect(agg.perField.roaster.accuracy).toBe(1);
    expect(agg.perField.process.accuracy).toBe(0.5);
    expect(agg.fullParseRate).toBe(0.5); // only the first label is all-correct
    // mean of 1, 1, 0.5, 0.5
    expect(agg.meanFieldAccuracy).toBe(0.75);
  });

  it("returns zeroes for an empty dataset without dividing by zero", () => {
    const agg = aggregate([]);
    expect(agg.count).toBe(0);
    expect(agg.meanFieldAccuracy).toBe(0);
    expect(agg.fullParseRate).toBe(0);
    expect(agg.perField.roaster.accuracy).toBe(0);
  });
});
