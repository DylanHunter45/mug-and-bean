/**
 * Catalog API response contracts.
 *
 * The JSON shape the coffee-database endpoints return, kept framework-agnostic
 * so a future React Native client can import these exact types and stay in sync
 * with the web app. Responses are camelCase and decoupled from the snake_case
 * database columns - the mappers in ./query do that translation, so the public
 * API is not hostage to the schema's naming.
 */

/** A flavour tag as surfaced on a coffee (the controlled vocabulary entry). */
export interface FlavourTagRef {
  name: string;
  slug: string;
  category: string;
}

/** The roaster fields carried inline on a coffee summary. */
export interface RoasterRef {
  id: string | null;
  name: string | null;
  slug: string | null;
}

/** The richer roaster block returned with a coffee detail. */
export interface RoasterDetail extends RoasterRef {
  country: string | null;
  city: string | null;
  websiteUrl: string | null;
}

/** A coffee as returned in list/search results. */
export interface CoffeeSummary {
  id: string;
  name: string;
  roaster: RoasterRef;
  originCountry: string | null;
  region: string | null;
  process: string | null;
  varietal: string | null;
  roastLevel: string | null;
  altitudeMinMeters: number | null;
  altitudeMaxMeters: number | null;
  tastingNotes: string | null;
  isDecaf: boolean;
  flavourTags: FlavourTagRef[];
}

/** A single coffee with its full detail (roaster block + timestamps). */
export interface CoffeeDetail extends CoffeeSummary {
  roaster: RoasterDetail;
  description: string | null;
  bagImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A roaster as returned in list/search results (for entry autocomplete). */
export interface RoasterSummary {
  id: string;
  name: string;
  slug: string | null;
  country: string | null;
  city: string | null;
  coffeeCount: number;
}

/** Pagination envelope metadata attached to list responses. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** A paginated list response: the page of rows plus pagination metadata. */
export interface Paginated<T> {
  data: T[];
  pagination: PaginationMeta;
}

/** A non-paginated list response (e.g. the flavour-tag vocabulary). */
export interface ListResponse<T> {
  data: T[];
}

/** The uniform error body every endpoint returns on failure. */
export interface ApiError {
  error: string;
}
