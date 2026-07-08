/**
 * Auth server actions.
 *
 * Email/password sign-in & sign-up, OAuth kickoff (Google / Apple), and
 * sign-out. These run on the server, so the Supabase client here is the
 * cookie-bound server client - calling its auth methods writes the session
 * cookies that the middleware then keeps refreshed.
 *
 * Error handling convention: on failure we redirect back to the form with a
 * human-readable `?error=` (and preserve `?redirect=`) rather than throwing, so
 * the user sees an inline message instead of a crash page.
 */
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { friendlyAuthMessage } from "@/lib/auth/errors";
import { LOGIN_PATH, safeRedirectPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

const SIGNUP_PATH = "/signup";

/** Build `path?key=value&...`, dropping empty values and encoding the rest. */
function withParams(path: string, params: Record<string, string>): string {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== ""),
  ).toString();
  return query ? `${path}?${query}` : path;
}

export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeRedirectPath(formData.get("redirect")?.toString());

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      withParams(LOGIN_PATH, {
        error: friendlyAuthMessage(error.message, error.code),
        email,
        redirect: next,
      }),
    );
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeRedirectPath(formData.get("redirect")?.toString());
  const origin =
    (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Used only when email confirmation is enabled (hosted). The link lands
      // on /auth/confirm, which verifies the token and forwards to `next`.
      emailRedirectTo: withParams(`${origin}/auth/confirm`, { next }),
    },
  });

  if (error) {
    redirect(
      withParams(SIGNUP_PATH, {
        error: friendlyAuthMessage(error.message, error.code),
        email,
        redirect: next,
      }),
    );
  }

  revalidatePath("/", "layout");

  // With email confirmation OFF (local default), signUp returns a live session
  // and the user is signed in immediately. With it ON (hosted), there is no
  // session yet - send them to log in with a "check your email" notice. We pass
  // `email` along so the login page can offer a "resend confirmation" control
  // (re-running signUp on an existing address does NOT re-send the email).
  if (data.session) {
    redirect(next);
  }

  redirect(
    withParams(LOGIN_PATH, {
      message:
        "Check your email to confirm your account, then sign in. It can take a minute - check your spam folder too.",
      email,
      redirect: next,
    }),
  );
}

/**
 * Re-send the signup confirmation email for a pending (unconfirmed) address.
 *
 * Needed because calling `signUp` again on an existing email does NOT send a
 * fresh link - Supabase treats it as a repeat signup (anti-enumeration) and
 * stays silent. `auth.resend` is the supported way to re-issue the link. Still
 * subject to the mailer's rate limit, surfaced via `friendlyAuthMessage`.
 */
export async function resendConfirmation(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const next = safeRedirectPath(formData.get("redirect")?.toString());
  const origin =
    (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: withParams(`${origin}/auth/confirm`, { next }),
    },
  });

  if (error) {
    redirect(
      withParams(LOGIN_PATH, {
        error: friendlyAuthMessage(error.message, error.code),
        email,
        redirect: next,
      }),
    );
  }

  redirect(
    withParams(LOGIN_PATH, {
      message:
        "Confirmation email re-sent. Check your inbox (and spam) - the link is single-use, so open it directly.",
      email,
      redirect: next,
    }),
  );
}

export async function signInWithOAuth(formData: FormData): Promise<void> {
  const provider = formData.get("provider")?.toString();
  if (provider !== "google" && provider !== "apple") {
    redirect(
      withParams(LOGIN_PATH, { error: "Unsupported sign-in provider." }),
    );
  }

  const next = safeRedirectPath(formData.get("redirect")?.toString());
  const origin =
    (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: withParams(`${origin}/auth/callback`, { next }),
    },
  });

  if (error) {
    redirect(withParams(LOGIN_PATH, { error: error.message, redirect: next }));
  }

  // Hand off to the provider's consent screen.
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(LOGIN_PATH);
}
