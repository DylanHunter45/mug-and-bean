/**
 * Sign-in page (/login).
 *
 * Server Component. Reads `?error` / `?message` (set by the auth actions) and
 * `?redirect` (the protected path the user was bounced from, preserved so we
 * can return them there after a successful sign-in).
 */
import Link from "next/link";

import { signIn } from "@/app/(auth)/actions";
import { AuthAlert } from "@/components/auth/AuthAlert";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { ResendConfirmation } from "@/components/auth/ResendConfirmation";
import { Button, Input } from "@/components/ui";
import { DEFAULT_AUTHED_PATH, safeRedirectPath } from "@/lib/auth/routes";

export default function LoginPage({
  searchParams,
}: {
  searchParams: {
    error?: string;
    message?: string;
    email?: string;
    redirect?: string;
  };
}) {
  const redirect = safeRedirectPath(searchParams.redirect);
  const pendingEmail = searchParams.email;

  return (
    <div className="flex flex-col gap-6 rounded-card border border-line bg-surface p-6 shadow-card">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-ink">Welcome back</h2>
        <p className="text-sm text-muted">Sign in to your cellar.</p>
      </div>

      <AuthAlert error={searchParams.error} message={searchParams.message} />

      {pendingEmail ? (
        <ResendConfirmation email={pendingEmail} redirect={redirect} />
      ) : null}

      <form action={signIn} className="flex flex-col gap-4">
        <input type="hidden" name="redirect" value={redirect} />
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Email
          <Input
            type="email"
            name="email"
            autoComplete="email"
            defaultValue={pendingEmail}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Password
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>

      <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <OAuthButtons redirect={redirect} />

      <p className="text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href={
            redirect === DEFAULT_AUTHED_PATH
              ? "/signup"
              : `/signup?redirect=${encodeURIComponent(redirect)}`
          }
          className="font-medium text-cherry-deep hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
