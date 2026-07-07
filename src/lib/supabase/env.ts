/**
 * Supabase environment access.
 *
 * Centralises reading the public Supabase env vars so a missing/blank value
 * fails loudly with an actionable message instead of surfacing as a confusing
 * "Invalid URL" deep inside the SDK. Copy `.env.example` → `.env.local` and
 * fill these in (point them at the local stack from `npm run db:start`, or a
 * hosted project - see supabase/README.md).
 */
export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/**
 * Read the public Supabase env vars, or `null` if either is missing/blank.
 * Use this where a missing config should degrade gracefully (the middleware,
 * which runs on every request before Supabase is even configured).
 */
export function getOptionalSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/**
 * Read the public Supabase env vars, throwing an actionable error if either is
 * missing. Use this where the code is about to perform a real auth operation -
 * failing loudly beats a confusing "Invalid URL" deep in the SDK.
 */
export function getSupabaseEnv(): SupabaseEnv {
  const env = getOptionalSupabaseEnv();
  if (!env) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example).",
    );
  }
  return env;
}
