/**
 * Session refresh + route protection for Next.js middleware.
 *
 * Runs on every matched request (see the root `middleware.ts`). Two jobs:
 *
 *   1. Refresh the auth session. `supabase.auth.getUser()` revalidates the
 *      token with the Auth server and, when it has expired, the SSR client
 *      writes refreshed cookies onto the response - which is how sessions stay
 *      alive without forcing a re-login.
 *   2. Gate protected routes. Unauthenticated requests to `/app/*` are
 *      redirected to `/login?redirect=<original path>`.
 *
 * IMPORTANT (per Supabase SSR guidance): do not run code between creating the
 * client and calling `getUser()`, and always return the `supabaseResponse`
 * object as-is (only copying cookies onto a redirect) so the refreshed auth
 * cookies are never dropped.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isProtectedPath, LOGIN_PATH } from "@/lib/auth/routes";

import { getOptionalSupabaseEnv } from "./env";

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  // Before Supabase is configured (no .env.local yet - it's a manual setup
  // step), there is no session to refresh or gate. Pass requests through rather
  // than 500-ing every page. Auth operations themselves still fail loudly.
  const env = getOptionalSupabaseEnv();
  if (!env) {
    return supabaseResponse;
  }
  const { url, anonKey } = env;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not run code between the client creation and getUser() - it revalidates
  // the token and refreshes cookies as a side effect.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    const target = request.nextUrl.pathname + request.nextUrl.search;
    redirectUrl.pathname = LOGIN_PATH;
    // Assign `.search` as a string directly - mutating NextURL.searchParams
    // after the fact does not reliably serialize into NextResponse.redirect.
    redirectUrl.search = `?redirect=${encodeURIComponent(target)}`;

    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Carry over any refreshed auth cookies onto the redirect response.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}
