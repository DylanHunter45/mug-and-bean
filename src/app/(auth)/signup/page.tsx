/**
 * Sign-up page (/signup).
 *
 * Server Component mirroring /login. Registers via the `signUp` action, which
 * either signs the user in immediately (email confirmation off - local default)
 * or sends them back to /login with a "check your email" notice (confirmation
 * on - hosted).
 */
import Link from "next/link";

import { signUp } from "@/app/(auth)/actions";
import { AuthAlert } from "@/components/auth/AuthAlert";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { Button, Input } from "@/components/ui";
import { DEFAULT_AUTHED_PATH, safeRedirectPath } from "@/lib/auth/routes";

export default function SignUpPage({
  searchParams,
}: {
  searchParams: { error?: string; redirect?: string };
}) {
  const redirect = safeRedirectPath(searchParams.redirect);

  return (
    <div className="flex flex-col gap-6 rounded-card border border-line bg-surface p-6 shadow-card">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-ink">Create your account</h2>
        <p className="text-sm text-muted">
          Start logging the coffees you brew.
        </p>
      </div>

      <AuthAlert error={searchParams.error} />

      <form action={signUp} className="flex flex-col gap-4">
        <input type="hidden" name="redirect" value={redirect} />
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Email
          <Input type="email" name="email" autoComplete="email" required />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Password
          <Input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={6}
          />
        </label>
        <Button type="submit" className="w-full">
          Sign up
        </Button>
      </form>

      <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <OAuthButtons redirect={redirect} />

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href={
            redirect === DEFAULT_AUTHED_PATH
              ? "/login"
              : `/login?redirect=${encodeURIComponent(redirect)}`
          }
          className="font-medium text-cherry-deep hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
