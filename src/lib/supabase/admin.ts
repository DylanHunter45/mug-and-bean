/**
 * Supabase service-role (admin) client.
 *
 * SERVER-ONLY. This client authenticates with the service-role key, which
 * BYPASSES Row Level Security — it can read and write any row. Use it only in
 * Route Handlers / Server Actions for operations that are intentionally not
 * scoped to a signed-in user (e.g. writing a public waitlist sign-up to a
 * table that is otherwise locked away from the anon/authenticated roles).
 *
 * Never import this from a Client Component. The runtime guard below throws if
 * it is ever evaluated in the browser, so a mis-wired import fails loudly
 * instead of silently shipping the service-role key to the client.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "createAdminClient() must never run in the browser — it uses the " +
        "service-role key, which bypasses Row Level Security.",
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin env vars. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY in .env.local (see .env.example).",
    );
  }

  // No session persistence / token refresh: this is a stateless server client,
  // not tied to any user's cookies.
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
