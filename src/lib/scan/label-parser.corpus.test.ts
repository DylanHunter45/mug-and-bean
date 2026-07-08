/**
 * Accuracy benchmark for the production label parser.
 *
 * Runs the real Google Cloud Vision transcriptions of the founder's label
 * collection (benchmark/ocr/ocr-samples.json, captured with
 * `npm run benchmark:ocr:capture`) through the parser and scores the three
 * required fields - roaster, origin, process - against the known-answer dataset.
 * The bar is >= 85% per field. The known roasters are supplied to the parser
 * (as they are in production, seeded from this same collection), so this also
 * proves the fuzzy-match lift on the roaster field that plain extraction misses.
 *
 * Scoring is language-aware: origin/process are compared on the printed (French)
 * `raw` value against the French ground truth, while roaster is compared on the
 * canonical `value` (the resolved catalog name). Matching is de-accented with
 * either-direction containment, mirroring the OCR benchmark's scorer.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { normalize } from "@/lib/ocr/scoring";
import type { GroundTruthLabel } from "@/lib/ocr/scoring";
import { parseLabel, type KnownRoaster } from "@/lib/scan/label-parser";

interface OcrSample {
  file: string;
  rawText: string;
}

const OCR_DIR = join(process.cwd(), "benchmark", "ocr");

const groundTruth: GroundTruthLabel[] = JSON.parse(
  readFileSync(join(OCR_DIR, "ground-truth.json"), "utf8"),
).labels;

const samples: OcrSample[] = JSON.parse(
  readFileSync(join(OCR_DIR, "ocr-samples.json"), "utf8"),
).samples;

const truthByFile = new Map(groundTruth.map((g) => [g.file, g]));

// The catalog, as seeded from this collection: one entry per distinct roaster.
const knownRoasters: KnownRoaster[] = [
  ...new Map(
    groundTruth.map((g) => [normalize(g.roaster), g.roaster]),
  ).values(),
].map((name, i) => ({ id: `roaster-${i}`, name }));

/** De-accented, either-direction containment (the OCR benchmark's match rule). */
function matches(expected: string, actual: string | null): boolean {
  if (!actual) return false;
  const e = normalize(expected);
  const a = normalize(actual);
  if (!e || !a) return false;
  return e === a || a.includes(e) || e.includes(a);
}

describe("label parser accuracy on the real OCR corpus", () => {
  it("has at least 30 representative OCR samples to test against", () => {
    expect(samples.length).toBeGreaterThanOrEqual(30);
  });

  const scored = samples
    .filter((s) => truthByFile.has(s.file))
    .map((s) => {
      const truth = truthByFile.get(s.file)!;
      const parsed = parseLabel(s.rawText, { knownRoasters });
      return {
        file: s.file,
        roaster: matches(truth.roaster, parsed.roaster.value),
        origin: matches(truth.origin, parsed.origin.raw),
        process: matches(truth.process, parsed.process.raw),
      };
    });

  const rate = (key: "roaster" | "origin" | "process") =>
    scored.filter((r) => r[key]).length / scored.length;

  it("extracts the roaster in >= 85% of labels (fuzzy-matched to the catalog)", () => {
    expect(rate("roaster")).toBeGreaterThanOrEqual(0.85);
  });

  it("extracts the origin in >= 85% of labels", () => {
    expect(rate("origin")).toBeGreaterThanOrEqual(0.85);
  });

  it("extracts the process in >= 85% of labels", () => {
    expect(rate("process")).toBeGreaterThanOrEqual(0.85);
  });
});
