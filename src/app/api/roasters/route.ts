/**
 * Roaster search - GET /api/roasters
 *
 * Requires authentication (401 otherwise): this backs the roaster autocomplete
 * in the signed-in scan / manual-entry flow, not public browsing. Fuzzy search
 * over roaster name is delegated to the `search_roasters` database function
 * (pg_trgm), with each row carrying its catalog coffee_count.
 *
 * Query params (all optional):
 *   q      - fuzzy search string
 *   page   - 1-based page number (default 1)
 *   limit  - page size (default 20, max 100)
 */
import { NextResponse } from "next/server";

import { apiError, authGate } from "@/lib/api/response";
import type { Paginated, RoasterSummary } from "@/lib/catalog/api-types";
import {
  buildPaginationMeta,
  mapRoasterSummary,
  optionalString,
  parsePagination,
  type RoasterSearchRow,
} from "@/lib/catalog/query";

export async function GET(request: Request) {
  const { userId, supabase } = await authGate();
  if (!userId) {
    return apiError("unauthorized", 401);
  }

  const params = new URL(request.url).searchParams;
  const pagination = parsePagination(params);
  const searchQuery = optionalString(params, "q");
  const rpcArgs = {
    search_query: searchQuery,
    result_limit: pagination.limit,
    result_offset: pagination.offset,
  };

  const { data, error } = await supabase.rpc("search_roasters", rpcArgs);

  if (error) {
    console.error("roasters search failed:", error);
    return apiError("server_error", 500);
  }

  const rows = (data ?? []) as RoasterSearchRow[];
  let total = rows.length > 0 ? Number(rows[0].total_count) : 0;

  // A page past the end returns no rows (and so no window total); recover it.
  if (rows.length === 0 && pagination.offset > 0) {
    const { data: totalData } = await supabase.rpc("search_roasters", {
      ...rpcArgs,
      result_limit: 1,
      result_offset: 0,
    });
    const totalRows = (totalData ?? []) as RoasterSearchRow[];
    total = totalRows.length > 0 ? Number(totalRows[0].total_count) : 0;
  }

  const body: Paginated<RoasterSummary> = {
    data: rows.map(mapRoasterSummary),
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
  return NextResponse.json(body);
}
