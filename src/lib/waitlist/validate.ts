/**
 * Waitlist email validation + normalisation.
 *
 * Framework-agnostic on purpose: the same rules run client-side (fast feedback
 * in the form) and server-side (the authoritative gate in the capture
 * endpoint), so the two can never drift apart. No React, no Supabase imports —
 * safe to pull into a `"use client"` component and an API route alike.
 */

/**
 * Pragmatic email shape check: a non-empty local part, an `@`, and a dotted
 * domain, with no spaces. Deliberately not RFC 5322 — the goal is to reject
 * obvious typos, not to adjudicate exotic-but-legal addresses (deliverability
 * is the real test, and that only happens when we email them).
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** RFC 5321 caps a full email address at 254 characters. */
export const MAX_EMAIL_LENGTH = 254;

/** Trim surrounding whitespace and lower-case, so `Foo@X.com ` === `foo@x.com`. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * True when `raw` looks like a usable email address. Trims first (a stray
 * trailing space shouldn't fail an otherwise-valid address) and enforces the
 * length cap before the pattern check.
 */
export function isValidEmail(raw: string): boolean {
  const email = raw.trim();
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);
}
