/**
 * Capture raw OCR text samples for the label-parser unit tests.
 *
 * Runs the founder's label collection (benchmark/ocr/labels/, gitignored) through
 * Google Cloud Vision ONCE and writes the raw transcriptions to
 * benchmark/ocr/ocr-samples.json (committed). The parser's test suite reads that
 * file, so tests exercise real OCR output without needing images or credentials
 * in CI. Re-run this only when the label set or the OCR engine changes.
 *
 * Usage (from repo root):
 *   npm run benchmark:ocr:capture
 *   npm run benchmark:ocr:capture -- --limit=10
 *
 * The transcribed text is the same French label data already committed in
 * ground-truth.json, so committing it introduces nothing new to the public repo.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { googleVisionProvider } from "../../src/lib/ocr/providers";
import type { GroundTruthLabel } from "../../src/lib/ocr/scoring";

const ROOT = process.cwd();
const OCR_DIR = join(ROOT, "benchmark", "ocr");
const LABELS_DIR = join(OCR_DIR, "labels");
const GROUND_TRUTH = join(OCR_DIR, "ground-truth.json");
const OUT = join(OCR_DIR, "ocr-samples.json");

/**
 * Minimal `.env.local` loader - this standalone `tsx` script doesn't pick up
 * `.env.local` the way a Next.js process does, so credentials would be missing.
 * Mirrors the loader in run.ts (kept local so the two scripts stay independent).
 */
function loadEnvLocal(): void {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}

/** One captured transcription. Keyed by `file` so tests can join on ground truth. */
interface OcrSample {
  file: string;
  rawText: string;
}

function parseLimit(argv: string[]): number | undefined {
  for (const a of argv) {
    const [k, v] = a.replace(/^--/, "").split("=");
    if (k === "limit") return Number(v);
  }
  return undefined;
}

async function main(): Promise<void> {
  loadEnvLocal();
  if (!process.env.GOOGLE_CLOUD_VISION_API_KEY) {
    throw new Error(
      "GOOGLE_CLOUD_VISION_API_KEY is not set - add it to .env.local before capturing.",
    );
  }

  const json = JSON.parse(readFileSync(GROUND_TRUTH, "utf8"));
  const labels: GroundTruthLabel[] = json.labels ?? [];
  const limit = parseLimit(process.argv.slice(2));
  const subset = limit ? labels.slice(0, limit) : labels;

  const samples: OcrSample[] = [];
  for (const label of subset) {
    const imagePath = join(LABELS_DIR, label.file);
    if (!existsSync(imagePath)) {
      console.warn(`  ! missing image, skipping: ${label.file}`);
      continue;
    }
    const bytes = readFileSync(imagePath);
    const { rawText } = await googleVisionProvider.recognize(bytes);
    samples.push({ file: label.file, rawText });
    console.log(`  captured ${label.file} (${rawText.length} chars)`);
  }

  const payload = {
    _comment:
      "Raw Google Cloud Vision transcriptions of benchmark/ocr/labels/, keyed by 'file' to join with ground-truth.json. Regenerate with `npm run benchmark:ocr:capture`. Used by the label-parser test suite so it runs without images or credentials.",
    provider: googleVisionProvider.id,
    capturedAt: new Date().toISOString(),
    samples,
  };
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`\nWrote ${samples.length} samples to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
