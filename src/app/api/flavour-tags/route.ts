/**
 * Flavour-tag vocabulary - GET /api/flavour-tags
 *
 * Requires authentication (401 otherwise): this feeds the flavour picker in the
 * signed-in entry flow. Returns the controlled vocabulary grouped by category
 * then name. An optional `q` narrows by name substring for type-ahead.
 *
 * Query params (all optional):
 *   q  - name substring filter
 */
import { NextResponse } from "next/server";

import { apiError, authGate } from "@/lib/api/response";
import type { FlavourTagRef, ListResponse } from "@/lib/catalog/api-types";
import { optionalString } from "@/lib/catalog/query";

export async function GET(request: Request) {
  const { userId, supabase } = await authGate();
  if (!userId) {
    return apiError("unauthorized", 401);
  }

  const searchQuery = optionalString(new URL(request.url).searchParams, "q");

  let query = supabase
    .from("flavour_tags")
    .select("name, slug, category")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (searchQuery) {
    query = query.ilike("name", `%${searchQuery}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("flavour-tags list failed:", error);
    return apiError("server_error", 500);
  }

  const body: ListResponse<FlavourTagRef> = {
    data: (data ?? []) as FlavourTagRef[],
  };
  return NextResponse.json(body);
}
