/**
 * Google / Apple OAuth buttons.
 *
 * Each button is its own `<form>` posting to the `signInWithOAuth` server
 * action with a hidden `provider` field (and the post-login `redirect` target).
 * The action exchanges that for the provider's consent URL and redirects there.
 *
 * NOTE: the providers must be configured + enabled in Supabase Auth for these
 * to complete. Apple additionally needs an Apple Developer account.
 */
import { signInWithOAuth } from "@/app/(auth)/actions";

function OAuthForm({
  provider,
  label,
  redirect,
}: {
  provider: "google" | "apple";
  label: string;
  redirect: string;
}) {
  return (
    <form action={signInWithOAuth}>
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="redirect" value={redirect} />
      <button
        type="submit"
        className="w-full rounded-full border border-line bg-surface-2 px-4 py-2.5 text-sm font-medium text-cream transition-colors hover:border-jade/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        {label}
      </button>
    </form>
  );
}

export function OAuthButtons({ redirect }: { redirect: string }) {
  return (
    <div className="flex flex-col gap-3">
      <OAuthForm
        provider="google"
        label="Continue with Google"
        redirect={redirect}
      />
      <OAuthForm
        provider="apple"
        label="Continue with Apple"
        redirect={redirect}
      />
    </div>
  );
}
