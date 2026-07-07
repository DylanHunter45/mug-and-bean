/**
 * Waitlist capture endpoint - POST /api/waitlist
 *
 * Persists a landing-page sign-up to the `waitlist` table. The table is locked
 * away from the public Data API roles, so this runs with the service-role
 * client (see `createAdminClient`) - the single server-side writer.
 *
 * Behaviour:
 *   - Re-validates the email server-side (the form validates too; this is the
 *     authoritative gate) and stores it normalised.
 *   - Duplicates are a graceful no-op: an `on conflict do nothing` upsert whose
 *     returned rows tell us whether this address was newly added, so the caller
 *     can show "you're already on the list" instead of an error.
 *   - Fires the optional welcome email only for genuinely new sign-ups, and
 *     never lets an email failure fail the sign-up.
 */
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidEmail, normalizeEmail } from "@/lib/waitlist/validate";
import { sendWelcomeEmail } from "@/lib/waitlist/welcome-email";

const MAX_REFERRAL_LENGTH = 200;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const body = (payload ?? {}) as Record<string, unknown>;
  const rawEmail = typeof body.email === "string" ? body.email : "";

  // Authoritative server-side validation (the form gates too, but never trust
  // the client).
  if (!isValidEmail(rawEmail)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const email = normalizeEmail(rawEmail);
  const referralSource =
    typeof body.referralSource === "string" && body.referralSource.trim()
      ? body.referralSource.trim().slice(0, MAX_REFERRAL_LENGTH)
      : null;

  const supabase = createAdminClient();

  // `ignoreDuplicates` → INSERT ... ON CONFLICT (email) DO NOTHING. The select
  // returns the row only when one was actually inserted, so an empty result
  // means "already on the list" - no error-code sniffing, no info leak.
  const { data, error } = await supabase
    .from("waitlist")
    .upsert(
      { email, referral_source: referralSource },
      { onConflict: "email", ignoreDuplicates: true },
    )
    .select("id");

  if (error) {
    console.error("waitlist insert failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const isNewSignup = (data?.length ?? 0) > 0;

  if (isNewSignup) {
    // Best-effort: a welcome-email failure must not fail the sign-up.
    try {
      await sendWelcomeEmail(email);
    } catch (emailError) {
      console.error("waitlist welcome email failed:", emailError);
    }
  }

  return NextResponse.json({
    status: isNewSignup ? "subscribed" : "already_subscribed",
  });
}
