/**
 * Optional transactional "welcome to the waitlist" email.
 *
 * SERVER-ONLY. Fully optional and self-disabling: with no `RESEND_API_KEY`
 * configured (the common case in local dev and until email is turned on) this
 * is an instant no-op, so it never slows a sign-up or fails one. Sending is
 * best-effort - a Resend outage must not turn a successful sign-up into an
 * error for the visitor, so the caller treats a failure here as non-fatal.
 *
 * Uses the Resend REST API directly via `fetch` - no SDK dependency.
 */
const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Verified sender for the Resend account; overridable per environment.
const FROM_ADDRESS =
  process.env.WAITLIST_FROM_EMAIL ?? "Mug & Bean <hello@mug-and-bean.com>";

export interface WelcomeEmailResult {
  /** "sent" when Resend accepted it, "skipped" when email isn't configured. */
  status: "sent" | "skipped";
}

/**
 * Send the waitlist welcome email. Returns `{ status: "skipped" }` when no
 * Resend key is set. Throws only on a genuine send failure (the caller decides
 * whether to swallow it - for sign-ups, it should).
 */
export async function sendWelcomeEmail(
  email: string,
): Promise<WelcomeEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { status: "skipped" };

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [email],
      subject: "You're on the Mug & Bean waitlist",
      text:
        "Thanks for joining the Mug & Bean waitlist.\n\n" +
        "You're holding a founding spot in the cellar - we'll email you the " +
        "moment early access opens. Until then, keep drinking well.\n\n" +
        "- Mug & Bean",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Resend returned ${response.status} ${response.statusText}: ${detail}`,
    );
  }

  return { status: "sent" };
}
