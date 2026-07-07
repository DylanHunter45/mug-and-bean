/**
 * Supabase server client.
 *
 * Use this in Server Components, Route Handlers, and Server Actions. It is
 * bound to the request's cookie jar so it sees the signed-in user and can write
 * refreshed auth cookies back.
 *
 * `cookies()` is request-scoped, so a fresh client must be created per request
 * - never cache the returned client across requests (it would leak one user's
 * session into another's). Hence this is a function, not a module singleton.
 */
import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` was called from a Server Component, where cookies are
          // read-only. This is safe to ignore as long as the root middleware
          // (which CAN write cookies) is refreshing sessions - which it is.
        }
      },
    },
  });
}
