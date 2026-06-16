/**
 * OAuth (PKCE) callback handler.
 *
 * Providers redirect back here with a `?code=` after the user consents.
 * `exchangeCodeForSession` swaps that code for a session and writes the auth
 * cookies (via the server client's cookie adapter), then we forward the user to
 * their intended destination (`?next=`, validated) — or to an error page if the
 * exchange fails.
 */
import { NextResponse } from "next/server";

import { safeRedirectPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
