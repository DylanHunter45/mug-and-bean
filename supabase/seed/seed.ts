/**
 * Coffee catalog seed pipeline.
 *
 * Loads the founder's physical bag-label collection into the shared catalog
 * (`roasters`, `coffees`, `flavour_tags`, `coffee_flavour_tags`). That same
 * collection is the OCR ground-truth corpus, so this reads it straight from
 * benchmark/ocr/ground-truth.json - one source of truth, no hand-maintained
 * duplicate. The as-printed French label text is canonicalised on the way in by
 * src/lib/catalog/normalize (origin/process/flavour -> canonical English;
 * proper nouns kept as printed).
 *
 * Idempotent: safe to re-run. Roasters and flavour tags upsert on their unique
 * slug; coffees are matched by (roaster, name) so an existing row is left as-is;
 * coffee<->tag links upsert on their composite key. A second run inserts nothing
 * new.
 *
 * Auth: uses the Supabase service-role client, which bypasses RLS. Seeded
 * catalog rows are curated system data, so `created_by` is left null (they are
 * not user contributions).
 *
 * Usage (from repo root, with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * set in .env.local for the target environment):
 *   npm run db:seed
 *   npm run db:seed -- --dry-run    # transform + report, write nothing
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { createAdminClient } from "../../src/lib/supabase/admin";
import {
  canonicalFlavourTags,
  canonicalOrigin,
  canonicalProcess,
  cleanDisplay,
  parseAltitudeRange,
  slugify,
  type FlavourTag,
} from "../../src/lib/catalog/normalize";

const ROOT = process.cwd();
const GROUND_TRUTH = join(ROOT, "benchmark", "ocr", "ground-truth.json");

/** One entry in the ground-truth corpus (label values as printed, in French). */
interface GroundTruthLabel {
  file: string;
  roaster: string;
  origin: string;
  process: string;
  tastingNotes: string[];
  name: string;
  region?: string;
  variety?: string;
  altitude?: string;
  roastedDate?: string;
}

interface RoasterSeed {
  name: string;
  slug: string;
}

interface CoffeeSeed {
  roasterSlug: string;
  name: string;
  origin_country: string;
  region: string | null;
  process: string;
  varietal: string | null;
  altitude_min_meters: number | null;
  altitude_max_meters: number | null;
  tasting_notes: string;
  tags: FlavourTag[];
}

interface Catalog {
  roasters: RoasterSeed[];
  flavourTags: FlavourTag[];
  coffees: CoffeeSeed[];
}

/**
 * Minimal .env.local loader - a standalone tsx script doesn't inherit Next.js's
 * automatic .env.local loading, so read simple KEY=VALUE lines without
 * overriding anything already set in the shell.
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

/** Turn the raw label corpus into a de-duplicated, canonical catalog. */
function buildCatalog(labels: GroundTruthLabel[]): Catalog {
  const roasters = new Map<string, RoasterSeed>();
  const flavourTags = new Map<string, FlavourTag>();
  const coffees = new Map<string, CoffeeSeed>();

  for (const label of labels) {
    const roasterName = cleanDisplay(label.roaster);
    const roasterSlug = slugify(roasterName);
    if (roasterSlug && !roasters.has(roasterSlug)) {
      roasters.set(roasterSlug, { name: roasterName, slug: roasterSlug });
    }

    const tags = canonicalFlavourTags(label.tastingNotes ?? []);
    for (const tag of tags) {
      if (!flavourTags.has(tag.slug)) flavourTags.set(tag.slug, tag);
    }

    const coffeeName = cleanDisplay(label.name);
    const coffeeKey = `${roasterSlug}::${slugify(coffeeName)}`;
    // First occurrence wins: the same coffee can appear on more than one bag
    // (a re-roast), which collapses to one catalog row.
    if (coffees.has(coffeeKey)) continue;

    const altitude = parseAltitudeRange(label.altitude ?? "");
    const notesText = (label.tastingNotes ?? [])
      .map((n) => cleanDisplay(n))
      .filter(Boolean)
      .join(", ");

    coffees.set(coffeeKey, {
      roasterSlug,
      name: coffeeName,
      origin_country: canonicalOrigin(label.origin).value,
      region: label.region ? cleanDisplay(label.region) : null,
      process: canonicalProcess(label.process),
      varietal: label.variety ? cleanDisplay(label.variety) : null,
      altitude_min_meters: altitude.min,
      altitude_max_meters: altitude.max,
      tasting_notes: notesText,
      tags,
    });
  }

  return {
    roasters: [...roasters.values()],
    flavourTags: [...flavourTags.values()],
    coffees: [...coffees.values()],
  };
}

type Admin = ReturnType<typeof createAdminClient>;

/** Upsert roasters on their unique slug and return a slug -> id map. */
async function seedRoasters(
  db: Admin,
  roasters: RoasterSeed[],
): Promise<Map<string, string>> {
  const { error } = await db
    .from("roasters")
    .upsert(roasters, { onConflict: "slug", ignoreDuplicates: true });
  if (error) throw new Error(`roasters upsert failed: ${error.message}`);

  const { data, error: selErr } = await db
    .from("roasters")
    .select("id, slug")
    .in(
      "slug",
      roasters.map((r) => r.slug),
    );
  if (selErr) throw new Error(`roasters select failed: ${selErr.message}`);
  return new Map((data ?? []).map((r) => [r.slug as string, r.id as string]));
}

/** Upsert flavour tags on their unique slug and return a slug -> id map. */
async function seedFlavourTags(
  db: Admin,
  tags: FlavourTag[],
): Promise<Map<string, string>> {
  const { error } = await db
    .from("flavour_tags")
    .upsert(tags, { onConflict: "slug", ignoreDuplicates: true });
  if (error) throw new Error(`flavour_tags upsert failed: ${error.message}`);

  const { data, error: selErr } = await db
    .from("flavour_tags")
    .select("id, slug")
    .in(
      "slug",
      tags.map((t) => t.slug),
    );
  if (selErr) throw new Error(`flavour_tags select failed: ${selErr.message}`);
  return new Map((data ?? []).map((t) => [t.slug as string, t.id as string]));
}

/**
 * Insert coffees not already present (matched by roaster_id + name) and return a
 * "roasterId::name" -> id map for every seed coffee. `coffees` has no unique
 * constraint, so idempotency is enforced here by looking up existing rows first.
 */
async function seedCoffees(
  db: Admin,
  coffees: CoffeeSeed[],
  roasterIds: Map<string, string>,
): Promise<{ ids: Map<string, string>; inserted: number }> {
  const roasterIdsUsed = [
    ...new Set(coffees.map((c) => roasterIds.get(c.roasterSlug)!)),
  ];

  const { data: existing, error: selErr } = await db
    .from("coffees")
    .select("id, roaster_id, name")
    .in("roaster_id", roasterIdsUsed);
  if (selErr) throw new Error(`coffees select failed: ${selErr.message}`);

  const ids = new Map<string, string>();
  for (const row of existing ?? []) {
    ids.set(`${row.roaster_id}::${row.name}`, row.id as string);
  }

  const toInsert = coffees
    .map((c) => {
      const roaster_id = roasterIds.get(c.roasterSlug)!;
      return { c, roaster_id, key: `${roaster_id}::${c.name}` };
    })
    .filter(({ key }) => !ids.has(key));

  if (toInsert.length > 0) {
    const rows = toInsert.map(({ c, roaster_id }) => ({
      roaster_id,
      name: c.name,
      origin_country: c.origin_country,
      region: c.region,
      process: c.process,
      varietal: c.varietal,
      altitude_min_meters: c.altitude_min_meters,
      altitude_max_meters: c.altitude_max_meters,
      tasting_notes: c.tasting_notes,
    }));
    const { data: insertedRows, error } = await db
      .from("coffees")
      .insert(rows)
      .select("id, roaster_id, name");
    if (error) throw new Error(`coffees insert failed: ${error.message}`);
    for (const row of insertedRows ?? []) {
      ids.set(`${row.roaster_id}::${row.name}`, row.id as string);
    }
  }

  return { ids, inserted: toInsert.length };
}

/** Upsert coffee <-> flavour-tag links on their composite primary key. */
async function seedLinks(
  db: Admin,
  coffees: CoffeeSeed[],
  roasterIds: Map<string, string>,
  coffeeIds: Map<string, string>,
  tagIds: Map<string, string>,
): Promise<number> {
  const links: { coffee_id: string; flavour_tag_id: string }[] = [];
  for (const c of coffees) {
    const roaster_id = roasterIds.get(c.roasterSlug)!;
    const coffee_id = coffeeIds.get(`${roaster_id}::${c.name}`);
    if (!coffee_id) continue;
    for (const tag of c.tags) {
      const flavour_tag_id = tagIds.get(tag.slug);
      if (flavour_tag_id) links.push({ coffee_id, flavour_tag_id });
    }
  }
  if (links.length === 0) return 0;
  const { error } = await db.from("coffee_flavour_tags").upsert(links, {
    onConflict: "coffee_id,flavour_tag_id",
    ignoreDuplicates: true,
  });
  if (error)
    throw new Error(`coffee_flavour_tags upsert failed: ${error.message}`);
  return links.length;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  loadEnvLocal();

  if (!existsSync(GROUND_TRUTH)) {
    throw new Error(`Missing corpus: ${GROUND_TRUTH}`);
  }
  const parsed = JSON.parse(readFileSync(GROUND_TRUTH, "utf8")) as {
    labels: GroundTruthLabel[];
  };
  const catalog = buildCatalog(parsed.labels ?? []);

  console.log("Coffee catalog seed");
  console.log(`  source labels : ${parsed.labels?.length ?? 0}`);
  console.log(`  roasters      : ${catalog.roasters.length}`);
  console.log(`  coffees       : ${catalog.coffees.length}`);
  console.log(`  flavour tags  : ${catalog.flavourTags.length}`);

  if (dryRun) {
    console.log("\n--dry-run: nothing written. Sample coffees:");
    for (const c of catalog.coffees.slice(0, 5)) {
      const alt =
        c.altitude_min_meters === null
          ? "-"
          : c.altitude_min_meters === c.altitude_max_meters
            ? `${c.altitude_min_meters}m`
            : `${c.altitude_min_meters}-${c.altitude_max_meters}m`;
      console.log(
        `  - ${c.name} (${c.roasterSlug}) | ${c.origin_country} | ${c.process} | ${alt} | ${c.tags.map((t) => t.name).join(", ")}`,
      );
    }
    return;
  }

  const db = createAdminClient();
  const roasterIds = await seedRoasters(db, catalog.roasters);
  const tagIds = await seedFlavourTags(db, catalog.flavourTags);
  const { ids: coffeeIds, inserted } = await seedCoffees(
    db,
    catalog.coffees,
    roasterIds,
  );
  const linkCount = await seedLinks(
    db,
    catalog.coffees,
    roasterIds,
    coffeeIds,
    tagIds,
  );

  console.log("\nDone.");
  console.log(`  roasters present  : ${roasterIds.size}`);
  console.log(`  flavour tags present : ${tagIds.size}`);
  console.log(
    `  coffees inserted  : ${inserted} (of ${catalog.coffees.length})`,
  );
  console.log(`  tag links ensured : ${linkCount}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
