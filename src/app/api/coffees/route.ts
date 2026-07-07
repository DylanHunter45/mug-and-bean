/**
 * Coffee catalog search - GET /api/coffees
 *
 * Public (no auth): the shared catalog is world-readable, and the landing
 * catalogue browses it anonymously. Fuzzy, typo-tolerant search over coffee
 * name / origin / region / roaster is delegated to the `search_coffees`
 * database function (pg_trgm), which also applies the filters and pagination and
 * returns the full filtered total alongside each row.
 *
 * Query params (all optional):
 *   q        - fuzzy search string
 *   origin   - filter by origin country (substring)
 *   process  - filter by process method (substring)
 *   roaster  - filter by roaster id (uuid; ignored if malformed)
 *   flavour  - comma-separated flavour-tag slugs (matches ANY)
 *   decaf    - true|false
 *   page     - 1-based page number (default 1)
 *   limit    - page size (default 20, max 100)
 */
import { NextResponse } from "next/server";

import { apiError } from "@/lib/api/response";
import type { CoffeeSummary, Paginated } from "@/lib/catalog/api-types";
import {
  buildPaginationMeta,
  mapCoffeeSummary,
  parseCoffeeSearchArgs,
  parsePagination,
  type CoffeeSearchArgs,
  type CoffeeSearchRow,
} from "@/lib/catalog/query";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const pagination = parsePagination(params);
  const args = parseCoffeeSearchArgs(params, pagination);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_coffees", args);

  if (error) {
    console.error("coffees search failed:", error);
    return apiError("server_error", 500);
  }

  const rows = (data ?? []) as CoffeeSearchRow[];
  let total = rows.length > 0 ? Number(rows[0].total_count) : 0;

  // The window count only rides along on returned rows, so a page past the end
  // of the result set comes back empty with no total. Recover the real total
  // with one cheap follow-up (rare path only).
  if (rows.length === 0 && pagination.offset > 0) {
    total = await fetchTotal(supabase, args);
  }

  const body: Paginated<CoffeeSummary> = {
    data: rows.map(mapCoffeeSummary),
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
  return NextResponse.json(body);
}

/** Re-run the same filters for a single row just to read its window total. */
async function fetchTotal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: CoffeeSearchArgs,
): Promise<number> {
  const { data } = await supabase.rpc("search_coffees", {
    ...args,
    result_limit: 1,
    result_offset: 0,
  });
  const rows = (data ?? []) as CoffeeSearchRow[];
  return rows.length > 0 ? Number(rows[0].total_count) : 0;
}
