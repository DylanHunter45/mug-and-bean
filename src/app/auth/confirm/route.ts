/**
 * Email confirmation / OTP verification handler.
 *
 * Confirmation links (signup, magic link, recovery) can arrive here in two
 * shapes, and we handle both:
 *
 *  - `token_hash` + `type`: the SSR-style link produced when the Supabase email
 *    template is customised to the `{{ .TokenHash }}` form. Verified server-side
 *    via `verifyOtp`, so it works on any device.
 *  - `code`: the DEFAULT Supabase template (`{{ .ConfirmationURL }}`) routes the
 *    click through Supabase's `/auth/v1/verify`, which on success redirects back
 *    here with a PKCE `code`. We exchange it for a session, same as the OAuth
 *    callback. (This path needs the same browser that started signup, since it
 *    relies on the PKCE code_verifier cookie - the `token_hash` form above is the
 *    cross-device option.)
 *
 * Used when email confirmation is enabled (hosted); locally it is off by default
 * so signup logs in directly.
 */
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { safeRedirectPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  const supabase = await createClient();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
