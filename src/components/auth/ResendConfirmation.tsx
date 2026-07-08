/**
 * "Didn't get the confirmation email?" resend control.
 *
 * Shown on /login after a sign-up that needs email confirmation (the login page
 * receives the pending address as `?email=`). Posts it to the
 * `resendConfirmation` action, which re-issues the confirmation link via
 * `auth.resend` - re-running sign-up on an existing address does NOT re-send.
 */
import { resendConfirmation } from "@/app/(auth)/actions";

export function ResendConfirmation({
  email,
  redirect,
}: {
  email: string;
  redirect: string;
}) {
  return (
    <form
      action={resendConfirmation}
      className="text-center text-sm text-muted"
    >
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="redirect" value={redirect} />
      Didn&apos;t get the email?{" "}
      <button
        type="submit"
        className="font-medium text-cherry-deep hover:underline"
      >
        Resend confirmation
      </button>
    </form>
  );
}
