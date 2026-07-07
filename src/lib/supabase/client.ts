/**
 * Supabase browser client.
 *
 * Use this in Client Components ("use client"). It reads the session from
 * cookies that the server-side middleware keeps fresh, so the browser and
 * server stay in agreement about who is signed in. Never import this from a
 * Server Component - use `./server` there instead.
 *
 * Only the public URL + anon key are referenced here; both are safe to ship to
 * the browser (RLS is the real authorization gate).
 */
import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
