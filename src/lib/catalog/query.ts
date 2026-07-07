/**
 * Catalog query parsing + row mapping.
 *
 * Framework-agnostic glue between an incoming request's query string and the
 * database, plus the reverse mapping from database rows to the public API
 * contract (./api-types). Keeping it here - not in the route handlers - means
 * the parsing/clamping rules are unit-testable in isolation and reusable by any
 * future client of the same catalog.
 */
import type {
  CoffeeDetail,
  CoffeeSummary,
  FlavourTagRef,
  PaginationMeta,
  RoasterSummary,
} from "./api-types";

/** Default and hard-cap page sizes. The cap stops a caller asking for the world. */
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

/** Strict integer parse: only a bare (optionally signed) integer string counts. */
function toInt(raw: string | null): number | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * Resolve `page` / `limit` query params into a clamped page window. Garbage or
 * missing values fall back to the defaults; `limit` is clamped to [1, MAX_LIMIT]
 * and `page` to >= 1, so pagination can never produce a negative offset or an
 * unbounded page.
 */
export function parsePagination(params: URLSearchParams): Pagination {
  const rawLimit = toInt(params.get("limit"));
  const rawPage = toInt(params.get("page"));
  const limit =
    rawLimit === null
      ? DEFAULT_LIMIT
      : Math.min(Math.max(rawLimit, 1), MAX_LIMIT);
  const page = rawPage === null ? 1 : Math.max(rawPage, 1);
  return { page, limit, offset: (page - 1) * limit };
}

/** A trimmed non-empty query param, or null. */
export function optionalString(
  params: URLSearchParams,
  key: string,
): string | null {
  const raw = params.get(key);
  if (raw === null) return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

/** A boolean-ish flag param: true/1 -> true, false/0 -> false, anything else -> null. */
export function optionalBoolean(
  params: URLSearchParams,
  key: string,
): boolean | null {
  const raw = optionalString(params, key);
  if (raw === null) return null;
  const v = raw.toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return null;
}

/** A comma-separated list param -> trimmed, de-duplicated, non-empty values (or null). */
export function optionalStringList(
  params: URLSearchParams,
  key: string,
): string[] | null {
  const raw = params.get(key);
  if (raw === null) return null;
  const items = [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  return items.length === 0 ? null : items;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True if `value` is a canonical UUID string. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Build the pagination metadata block from the total row count and the window. */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

// --- search_coffees RPC arguments ------------------------------------------

/** The argument object for the `search_coffees` database function. */
export interface CoffeeSearchArgs {
  search_query: string | null;
  origin_filter: string | null;
  process_filter: string | null;
  roaster_filter: string | null;
  flavour_slugs: string[] | null;
  decaf_filter: boolean | null;
  result_limit: number;
  result_offset: number;
}

/**
 * Translate the coffee-list query string into `search_coffees` arguments. An
 * invalid `roaster` value (not a UUID) is dropped rather than errored - the
 * filter is simply not applied - because the RPC's `roaster_filter` is typed
 * uuid and would otherwise fail the whole call.
 */
export function parseCoffeeSearchArgs(
  params: URLSearchParams,
  pagination: Pagination,
): CoffeeSearchArgs {
  const roaster = optionalString(params, "roaster");
  return {
    search_query: optionalString(params, "q"),
    origin_filter: optionalString(params, "origin"),
    process_filter: optionalString(params, "process"),
    roaster_filter: roaster && isUuid(roaster) ? roaster : null,
    flavour_slugs: optionalStringList(params, "flavour"),
    decaf_filter: optionalBoolean(params, "decaf"),
    result_limit: pagination.limit,
    result_offset: pagination.offset,
  };
}

// --- Database row shapes + mappers -----------------------------------------

/** One row returned by the `search_coffees` database function. */
export interface CoffeeSearchRow {
  id: string;
  name: string;
  roaster_id: string | null;
  roaster_name: string | null;
  roaster_slug: string | null;
  origin_country: string | null;
  region: string | null;
  process: string | null;
  varietal: string | null;
  roast_level: string | null;
  altitude_min_meters: number | null;
  altitude_max_meters: number | null;
  tasting_notes: string | null;
  is_decaf: boolean;
  flavour_tags: FlavourTagRef[] | null;
  relevance: number;
  total_count: number;
}

/** Map a `search_coffees` row to the public coffee-summary contract. */
export function mapCoffeeSummary(row: CoffeeSearchRow): CoffeeSummary {
  return {
    id: row.id,
    name: row.name,
    roaster: {
      id: row.roaster_id,
      name: row.roaster_name,
      slug: row.roaster_slug,
    },
    originCountry: row.origin_country,
    region: row.region,
    process: row.process,
    varietal: row.varietal,
    roastLevel: row.roast_level,
    altitudeMinMeters: row.altitude_min_meters,
    altitudeMaxMeters: row.altitude_max_meters,
    tastingNotes: row.tasting_notes,
    isDecaf: row.is_decaf,
    flavourTags: row.flavour_tags ?? [],
  };
}

/** One row returned by the `search_roasters` database function. */
export interface RoasterSearchRow {
  id: string;
  name: string;
  slug: string | null;
  country: string | null;
  city: string | null;
  coffee_count: number;
  relevance: number;
  total_count: number;
}

/** Map a `search_roasters` row to the public roaster-summary contract. */
export function mapRoasterSummary(row: RoasterSearchRow): RoasterSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    country: row.country,
    city: row.city,
    coffeeCount: Number(row.coffee_count),
  };
}

/** The embedded-select row shape for a single coffee's detail. */
export interface CoffeeDetailRow {
  id: string;
  name: string;
  origin_country: string | null;
  region: string | null;
  process: string | null;
  varietal: string | null;
  roast_level: string | null;
  altitude_min_meters: number | null;
  altitude_max_meters: number | null;
  tasting_notes: string | null;
  is_decaf: boolean;
  description: string | null;
  bag_image_url: string | null;
  created_at: string;
  updated_at: string;
  roaster: {
    id: string;
    name: string;
    slug: string | null;
    country: string | null;
    city: string | null;
    website_url: string | null;
  } | null;
  coffee_flavour_tags: { flavour_tags: FlavourTagRef | null }[] | null;
}

/** Map an embedded coffee-detail row to the public coffee-detail contract. */
export function mapCoffeeDetail(row: CoffeeDetailRow): CoffeeDetail {
  const flavourTags = (row.coffee_flavour_tags ?? [])
    .map((link) => link.flavour_tags)
    .filter((tag): tag is FlavourTagRef => tag !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    id: row.id,
    name: row.name,
    roaster: row.roaster
      ? {
          id: row.roaster.id,
          name: row.roaster.name,
          slug: row.roaster.slug,
          country: row.roaster.country,
          city: row.roaster.city,
          websiteUrl: row.roaster.website_url,
        }
      : {
          id: null,
          name: null,
          slug: null,
          country: null,
          city: null,
          websiteUrl: null,
        },
    originCountry: row.origin_country,
    region: row.region,
    process: row.process,
    varietal: row.varietal,
    roastLevel: row.roast_level,
    altitudeMinMeters: row.altitude_min_meters,
    altitudeMaxMeters: row.altitude_max_meters,
    tastingNotes: row.tasting_notes,
    isDecaf: row.is_decaf,
    flavourTags,
    description: row.description,
    bagImageUrl: row.bag_image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
