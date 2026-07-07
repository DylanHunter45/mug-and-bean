# Coffee catalog seed

Loads the founder's physical bag-label collection into the shared catalog
(`roasters`, `coffees`, `flavour_tags`, `coffee_flavour_tags`).

## Source: one corpus, double duty

The seed reads `benchmark/ocr/ground-truth.json` directly - the same known-answer
corpus used to benchmark OCR accuracy. Keeping a single source means the catalog
and the OCR ground truth never drift apart. Label values are stored as printed
(French) for proper nouns (coffee name, region, varietal, roaster) and
canonicalised to English for the enumerable fields (origin country, process,
flavour tags) by `src/lib/catalog/normalize.ts`. That normalisation module is
unit-tested and is the same one the scan-confirmation flow can reuse later.

## Run it

Point `.env.local` at the target environment (the seed uses the service-role key,
which bypasses RLS - seeded rows are curated system data with a null `created_by`):

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

For the local stack, both values are printed by `npx supabase status`
(`API_URL` and `SERVICE_ROLE_KEY`).

```bash
npm run db:seed              # upsert into the configured database
npm run db:seed -- --dry-run # transform + report only, write nothing
```

Then verify in Supabase Studio (local: http://127.0.0.1:54323) or via the app.

## Idempotent

Safe to re-run. Roasters and flavour tags upsert on their unique `slug`; coffees
are matched on `(roaster, name)` so an existing row is left untouched; the
coffee/tag links upsert on their composite primary key. A second run inserts
nothing new.

## Current dataset

54 source labels collapse to **52 coffees** (two coffees appear on more than one
bag), **37 roasters**, and **64 flavour tags** - comfortably above the 50-coffee
target that also serves as the OCR benchmarking corpus.
