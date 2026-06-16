/**
 * Auth error fallback.
 *
 * Shown when an OAuth code exchange or email-token verification fails (expired
 * link, reused code, misconfigured provider). Gives the user a way back to
 * /login rather than a dead end.
 */
import Link from "next/link";

import { buttonClasses } from "@/components/ui";

export default function AuthCodeErrorPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-cream">
        Sign-in link didn&apos;t work
      </h1>
      <p className="text-sm text-muted">
        That link may have expired or already been used. Please try signing in
        again.
      </p>
      <Link href="/login" className={buttonClasses()}>
        Back to sign in
      </Link>
    </main>
  );
}
