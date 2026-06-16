/**
 * Auth routing constants & pure helpers.
 *
 * Framework-agnostic (no Next.js imports) so it can be unit-tested in isolation
 * and reused by both the middleware and the auth pages. Keeping the
 * "which paths are protected" and "is this redirect safe" decisions here — as
 * plain functions — means they have a single source of truth and explicit tests
 * (see routes.test.ts).
 */

/** Sign-in page; unauthenticated hits on a protected route land here. */
export const LOGIN_PATH = "/login";

/** Where users go after a successful sign-in when no specific target is given. */
export const DEFAULT_AUTHED_PATH = "/app";

/**
 * Path prefixes that require an authenticated session. A request is protected
 * when its pathname equals one of these or sits beneath it (e.g. `/app` and
 * `/app/anything`, but not `/applesauce`).
 */
export const PROTECTED_PREFIXES = ["/app"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Validate a post-login redirect target before we trust it. Only same-origin
 * absolute paths are allowed — anything else (external URLs, protocol-relative
 * `//evil.com`, backslash tricks, non-paths) falls back to a safe default.
 * This blocks open-redirect abuse of the `?redirect=` query param.
 */
export function safeRedirectPath(
  candidate: string | null | undefined,
  fallback: string = DEFAULT_AUTHED_PATH,
): string {
  if (!candidate) return fallback;
  // Must be a root-relative path...
  if (!candidate.startsWith("/")) return fallback;
  // ...but not protocol-relative (`//host`) or a backslash variant (`/\host`).
  if (candidate.startsWith("//") || candidate.startsWith("/\\"))
    return fallback;
  return candidate;
}
