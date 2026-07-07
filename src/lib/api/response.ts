/**
 * Shared HTTP helpers for the API route handlers.
 *
 * A single place for the uniform JSON error envelope so every endpoint fails the
 * same way (`{ "error": "<code>" }` + status), and a small auth gate that turns
 * the SSR session into a 401 when no user is present.
 */
import { NextResponse } from "next/server";

import type { ApiError } from "@/lib/catalog/api-types";
import { createClient } from "@/lib/supabase/server";

/** Uniform JSON error response: `{ error }` with the given status. */
export function apiError(
  error: string,
  status: number,
): NextResponse<ApiError> {
  return NextResponse.json({ error }, { status });
}

/** Resolved cookie-bound server client, exposed so a handler can reuse it. */
type ServerClient = Awaited<ReturnType<typeof createClient>>;

export interface AuthGate {
  /** The signed-in user's id, or null when unauthenticated. */
  userId: string | null;
  /** The cookie-bound Supabase client, ready for the query. */
  supabase: ServerClient;
}

/**
 * Resolve the request's session. Returns the client alongside the user id so a
 * protected handler can gate on `userId` and then query with the same client.
 */
export async function authGate(): Promise<AuthGate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { userId: user?.id ?? null, supabase };
}
