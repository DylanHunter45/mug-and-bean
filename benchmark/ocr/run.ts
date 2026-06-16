/**
 * OCR Vendor Benchmark runner.
 *
 * Runs a sample label collection through each OCR provider, parses
 * the result into structured fields, scores it against ground truth, and writes
 * a per-vendor / per-field accuracy report (Markdown + JSON).
 *
 * Usage (from repo root):
 *   npm run benchmark:ocr                  # all providers with credentials
 *   npm run benchmark:ocr -- --provider=google-vision
 *   npm run benchmark:ocr -- --provider=aws-textract --limit=10
 *
 * Required setup:
 *   1. Drop ≥30 label images into benchmark/ocr/labels/ (see its README).
 *   2. Describe each in benchmark/ocr/ground-truth.json.
 *   3. Set credentials in .env.local (GOOGLE_CLOUD_VISION_API_KEY and/or AWS).
 *
 * This script is intentionally framework-free (Node + the src/lib/ocr layer) so
 * it can run in CI as a standalone job later.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { parseLabel } from "../../src/lib/ocr/parse";
import {
  aggregate,
  scoreLabel,
  type Aggregate,
  type GroundTruthLabel,
} from "../../src/lib/ocr/scoring";
import {
  PRICING_AS_OF,
  PROVIDERS,
  type ProviderEntry,
} from "../../src/lib/ocr/providers";
import {
  LABEL_FIELDS,
  LABEL_FIELD_LABELS,
  type OcrProvider,
} from "../../src/lib/ocr/types";

const ROOT = process.cwd();
const OCR_DIR = join(ROOT, "benchmark", "ocr");
const LABELS_DIR = join(OCR_DIR, "labels");
const GROUND_TRUTH = join(OCR_DIR, "ground-truth.json");
const RESULTS_DIR = join(OCR_DIR, "results");

/**
 * Minimal `.env.local` loader. Unlike a Next.js process, this standalone `tsx`
 * script doesn't pick up `.env.local` automatically, so the providers would see
 * no credentials. Parse simple `KEY=VALUE` lines (ignoring comments/blanks) and
 * populate `process.env` without overriding anything already set in the shell.
 * No dependency — keeps the benchmark runnable with just `tsx`.
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
    // Strip matching surrounding quotes.
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}

interface Args {
  provider?: string;
  limit?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (const a of argv) {
    const [k, v] = a.replace(/^--/, "").split("=");
    if (k === "provider") args.provider = v;
    if (k === "limit") args.limit = Number(v);
  }
  return args;
}

function loadGroundTruth(): GroundTruthLabel[] {
  if (!existsSync(GROUND_TRUTH)) {
    throw new Error(`Missing ${GROUND_TRUTH}. See benchmark/ocr/README.md.`);
  }
  const json = JSON.parse(readFileSync(GROUND_TRUTH, "utf8"));
  const labels: GroundTruthLabel[] = json.labels ?? [];
  return labels;
}

interface ProviderRun {
  entry: ProviderEntry;
  aggregate: Aggregate;
  latenciesMs: number[];
  scanned: number;
  errors: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length),
  );
  return sorted[idx];
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

async function runProvider(
  entry: ProviderEntry,
  provider: OcrProvider,
  labels: GroundTruthLabel[],
): Promise<ProviderRun> {
  const scores = [];
  const latenciesMs: number[] = [];
  let errors = 0;

  for (const label of labels) {
    const imagePath = join(LABELS_DIR, label.file);
    if (!existsSync(imagePath)) {
      console.warn(`  ! missing image, skipping: ${label.file}`);
      continue;
    }
    try {
      const bytes = readFileSync(imagePath);
      const result = await provider.recognize(bytes);
      latenciesMs.push(result.latencyMs);
      scores.push(scoreLabel(parseLabel(result.rawText), label));
    } catch (err) {
      errors++;
      console.warn(`  ! ${label.file}: ${(err as Error).message}`);
    }
  }

  return {
    entry,
    aggregate: aggregate(scores),
    latenciesMs,
    scanned: scores.length,
    errors,
  };
}

function renderReport(runs: ProviderRun[], totalLabels: number): string {
  const now = new Date().toISOString();
  const lines: string[] = [];

  lines.push("# OCR Vendor Benchmark Results");
  lines.push("");
  lines.push(`- **Generated:** ${now}`);
  lines.push(`- **Labels in dataset:** ${totalLabels}`);
  lines.push(
    `- **Target:** ≥ 85% correct parse rate (mean per-field accuracy) on the dataset`,
  );
  lines.push("");

  lines.push("## Per-field accuracy");
  lines.push("");
  const header = ["Vendor", ...LABEL_FIELDS.map((f) => LABEL_FIELD_LABELS[f])];
  lines.push(`| ${header.join(" | ")} |`);
  lines.push(`| ${header.map(() => "---").join(" | ")} |`);
  for (const run of runs) {
    const cells = LABEL_FIELDS.map((f) =>
      pct(run.aggregate.perField[f].accuracy),
    );
    lines.push(`| ${run.entry.provider.displayName} | ${cells.join(" | ")} |`);
  }
  lines.push("");

  lines.push("## Headline metrics");
  lines.push("");
  lines.push(
    "| Vendor | Mean field accuracy | Full-parse rate | Labels scanned | Errors | Mean latency | p95 latency | Est. cost / 1k |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const run of runs) {
    const sorted = [...run.latenciesMs].sort((a, b) => a - b);
    lines.push(
      `| ${run.entry.provider.displayName} | ${pct(
        run.aggregate.meanFieldAccuracy,
      )} | ${pct(run.aggregate.fullParseRate)} | ${run.scanned} | ${
        run.errors
      } | ${Math.round(mean(run.latenciesMs))} ms | ${Math.round(
        percentile(sorted, 95),
      )} ms | $${run.entry.pricePer1000UsdEstimate.toFixed(2)} |`,
    );
  }
  lines.push("");
  lines.push(
    `> Cost figures are estimates as of ${PRICING_AS_OF}; verify against each vendor's pricing page before quoting in the ADR.`,
  );
  lines.push("");

  lines.push("## Verdict");
  lines.push("");
  const passing = runs.filter((r) => r.aggregate.meanFieldAccuracy >= 0.85);
  if (passing.length > 0) {
    const best = [...runs].sort(
      (a, b) => b.aggregate.meanFieldAccuracy - a.aggregate.meanFieldAccuracy,
    )[0];
    lines.push(
      `**${best.entry.provider.displayName}** leads at ${pct(
        best.aggregate.meanFieldAccuracy,
      )} mean field accuracy and clears the ≥85% target. Record the decision in a vendor-selection decision record.`,
    );
  } else {
    lines.push(
      "No vendor cleared the ≥85% target on this dataset. Investigate parser gaps (vocabulary) and image quality before selecting.",
    );
  }
  lines.push("");
  return lines.join("\n");
}

async function main() {
  loadEnvLocal();
  const args = parseArgs(process.argv.slice(2));
  let labels = loadGroundTruth();
  if (args.limit) labels = labels.slice(0, args.limit);

  if (labels.length === 0) {
    console.log(
      "No labels in ground-truth.json yet.\n" +
        "Add ≥30 entries and drop the matching images in benchmark/ocr/labels/.\n" +
        "See benchmark/ocr/README.md for the format.",
    );
    return;
  }
  if (labels.length < 30) {
    console.warn(
      `⚠  Only ${labels.length} labels — ≥30 are required for a valid benchmark.\n`,
    );
  }

  const requested = args.provider ? [args.provider] : Object.keys(PROVIDERS);

  const runs: ProviderRun[] = [];
  for (const id of requested) {
    const entry = PROVIDERS[id];
    if (!entry) {
      console.warn(`Unknown provider "${id}" — skipping.`);
      continue;
    }
    if (!entry.hasCredentials()) {
      console.warn(
        `Skipping ${entry.provider.displayName}: no credentials configured.`,
      );
      continue;
    }
    console.log(`\n▶ Benchmarking ${entry.provider.displayName} …`);
    runs.push(await runProvider(entry, entry.provider, labels));
  }

  if (runs.length === 0) {
    console.error(
      "\nNo providers ran. Set GOOGLE_CLOUD_VISION_API_KEY and/or AWS credentials in .env.local.",
    );
    process.exitCode = 1;
    return;
  }

  const report = renderReport(runs, labels.length);
  mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const mdPath = join(RESULTS_DIR, `${stamp}-report.md`);
  const jsonPath = join(RESULTS_DIR, `${stamp}-report.json`);
  writeFileSync(mdPath, report);
  writeFileSync(
    jsonPath,
    JSON.stringify(
      runs.map((r) => ({
        provider: r.entry.provider.id,
        scanned: r.scanned,
        errors: r.errors,
        aggregate: r.aggregate,
        meanLatencyMs: Math.round(mean(r.latenciesMs)),
      })),
      null,
      2,
    ),
  );

  console.log("\n" + report);
  console.log(`\nReports written:\n  ${mdPath}\n  ${jsonPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
