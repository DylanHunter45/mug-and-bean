/**
 * Human-friendly copy for Supabase auth failures.
 *
 * Supabase returns terse, sometimes cryptic messages ("email rate limit
 * exceeded", "Invalid login credentials"). We rewrite the cases a real user can
 * actually hit into clear, actionable copy - and, importantly, steer email
 * delivery / throttling failures toward "wait and retry, or use Google" rather
 * than a dead end. Anything unrecognised falls through to the original message
 * so we never swallow a genuinely novel error.
 *
 * Pure and framework-agnostic so it can be unit-tested and shared by every auth
 * action (sign-in, sign-up, resend). Match on the stable error `code` first,
 * then fall back to message substrings for servers that don't send one.
 */
export function friendlyAuthMessage(raw: string, code?: string | null): string {
  const c = code ?? "";
  const m = raw.toLowerCase();

  // Email send throttling - the built-in Supabase mailer caps sends per hour.
  if (c === "over_email_send_rate_limit" || m.includes("rate limit")) {
    return "We're sending too many emails right now. Please wait a little while and try again - or continue with Google, which doesn't need email.";
  }

  // Generic request throttling.
  if (c === "over_request_rate_limit" || m.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  // Wrong email/password on sign-in.
  if (c === "invalid_credentials" || m.includes("invalid login credentials")) {
    return "That email or password doesn't match an account. Check them and try again.";
  }

  // Signing in before confirming the email link.
  if (c === "email_not_confirmed" || m.includes("email not confirmed")) {
    return "Please confirm your email first - check your inbox (and spam) for the confirmation link.";
  }

  // Malformed email address.
  if (
    c === "email_address_invalid" ||
    (m.includes("invalid") && m.includes("email"))
  ) {
    return "That email address looks invalid. Please double-check it.";
  }

  // Password too short/weak (signup enforces a 6-char minimum client-side too).
  if (c === "weak_password" || m.includes("password should be")) {
    return "That password is too weak. Use at least 6 characters.";
  }

  return raw;
}
