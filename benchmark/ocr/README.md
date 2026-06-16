# OCR Vendor Benchmark

A standalone harness that measures **Google Cloud Vision** against **AWS
Textract** on a sample label collection, so the OCR vendor choice is made on
data, not vibes. Record the decision it feeds in a vendor-selection decision
record.

## What it measures

For each vendor, against ground truth:

- **Per-field extraction accuracy** — Roaster Name, Origin, Process, Tasting Notes.
- **Full-parse rate** — labels where all four fields are correct.
- **Mean field accuracy** — the headline number checked against the **≥85% target**.
- **Latency** — mean and p95 per scan.
- **Cost** — published price per 1,000 pages (estimate; verify before quoting).

## How the pieces fit

```
benchmark/ocr/run.ts        ← orchestrates the run, writes the report
  └─ src/lib/ocr/providers   ← Google Vision (REST) + AWS Textract (SDK) adapters
  └─ src/lib/ocr/parse.ts    ← raw OCR text → structured fields + confidence
  └─ src/lib/ocr/scoring.ts  ← compare against ground truth → accuracy
benchmark/ocr/labels/        ← the image dataset (git-ignored binaries)
benchmark/ocr/ground-truth.json ← known answers, one row per image
benchmark/ocr/results/       ← generated .md + .json reports (git-ignored)
```

The `src/lib/ocr/*` layer is framework-agnostic on purpose — the chosen provider
and parser get reused by `POST /api/scan` and the parser.

## Setup

1. **Add the dataset.** Put ≥30 label photos in `labels/` and describe each in
   `ground-truth.json`. See [`labels/README.md`](./labels/README.md).

2. **Credentials** (copy `.env.example` → `.env.local`, fill in):
   - **Google Cloud Vision:** enable the Vision API on a GCP project, create an
     API key, set `GOOGLE_CLOUD_VISION_API_KEY`.
   - **AWS Textract:** set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
     `AWS_REGION` (or use `AWS_PROFILE`), and install the SDK:
     `npm i -D @aws-sdk/client-textract`.

   The runner skips any vendor whose credentials are absent, so you can measure
   one at a time.

## Run

```bash
npm run benchmark:ocr                          # every vendor with credentials
npm run benchmark:ocr -- --provider=google-vision
npm run benchmark:ocr -- --provider=aws-textract --limit=10
```

Reports are written to `results/<timestamp>-report.{md,json}` and printed to the
console. Paste the winning table into your vendor-selection decision record.

## Ground truth, language & scored fields

- **Record values in the label's language.** The seed dataset is **French**, so
  ground truth is `Lavé`/`Colombie`/`Cacao`, not `Washed`/`Colombia`/`Cocoa`.
  The OCR reads what's printed; translating in the ground truth would penalise
  correct OCR and measure translation instead. Canonical-English translation is a
  separate downstream step.
- **Only four fields are scored** — `roaster`, `origin`, `process`,
  `tastingNotes`. Each ground-truth row may also carry
  `name`/`region`/`variety`/`altitude`/`brewMethods`/`roastedDate`/`qrCode`;
  these are **recorded but ignored by the scorer**, kept for later reuse.
- **Schema follow-up (deferred).** Real labels carry data
  the `coffees` schema doesn't fully fit yet: altitude is a **range**
  (`1200M - 2000M`) but `coffees.altitude_meters` is a single `integer`, and
  there's no **roast date** column (it likely belongs on `user_coffees`, being
  per-physical-bag). Address these in a separate migration before the seed
  import, not in the OCR benchmark.

## Notes & caveats

- The parser here is **benchmark-grade** — transparent heuristics, **bilingual
  (EN + FR)**: it recognises the dataset's `ORIG.`/`PROC.` abbreviations, French
  process/origin vocabularies, and bullet-separated note lists, matching
  de-accented so `LAVÉ` == `lave`. The production parser hardens it (full
  vocabularies, DB fuzzy-match for roaster, autocomplete).
- **Roaster is the weak field on this layout.** These labels lead with the
  product name and print the roaster as a secondary line with no anchor, so the
  benchmark parser often mis-guesses it. A fuzzy match against the
  `roasters` catalog is the intended fix; expect roaster accuracy to lag the
  other three fields here.
- Both vendors get the _same_ parser and scorer, so the comparison isolates OCR
  text quality. A low score can mean weak OCR **or** a parser gap — eyeball a few
  `rawText` outputs before blaming a vendor.
- The runner loads `.env.local` itself (it's a standalone `tsx` script, not a
  Next process). `.env.local` is git-ignored; **never commit API keys**.
