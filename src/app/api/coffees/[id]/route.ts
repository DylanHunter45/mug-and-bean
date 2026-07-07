/**
 * Coffee detail - GET /api/coffees/[id]
 *
 * Public (no auth): returns one catalog coffee with its roaster block and
 * flavour tags via a single PostgREST embedded select. A malformed id is a 400
 * (before touching the database); a well-formed id with no match is a 404.
 */
import { NextResponse } from "next/server";

import { apiError } from "@/lib/api/response";
import type { CoffeeDetail } from "@/lib/catalog/api-types";
import {
  isUuid,
  mapCoffeeDetail,
  type CoffeeDetailRow,
} from "@/lib/catalog/query";
import { createClient } from "@/lib/supabase/server";

const COFFEE_DETAIL_SELECT = `
  id, name, origin_country, region, process, varietal, roast_level,
  altitude_min_meters, altitude_max_meters, tasting_notes, is_decaf,
  description, bag_image_url, created_at, updated_at,
  roaster:roasters ( id, name, slug, country, city, website_url ),
  coffee_flavour_tags ( flavour_tags ( name, slug, category ) )
`;

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  if (!isUuid(id)) {
    return apiError("invalid_id", 400);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coffees")
    .select(COFFEE_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle<CoffeeDetailRow>();

  if (error) {
    console.error("coffee detail failed:", error);
    return apiError("server_error", 500);
  }
  if (!data) {
    return apiError("not_found", 404);
  }

  const body: CoffeeDetail = mapCoffeeDetail(data);
  return NextResponse.json(body);
}
