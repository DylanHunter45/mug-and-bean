/**
 * Protected dashboard placeholder (/app).
 *
 * The landing page behind auth. It exists to prove the protected-route gate and
 * session wiring end-to-end; the real cellar UI ("My Coffees") is built later.
 * Reads the signed-in user from the cookie-bound server
 * client to confirm the session is readable in a Server Component.
 */
import Link from "next/link";

import { buttonClasses } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export default async function AppHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-3xl font-semibold text-ink">Your cellar</h1>
      <p className="text-ink-soft">
        You&apos;re signed in as{" "}
        <span className="font-medium text-ink">{user?.email}</span>. This is the
        protected area - the future home of &ldquo;My Coffees&rdquo;.
      </p>
      <div>
        <Link href="/app/scan" className={buttonClasses({ size: "lg" })}>
          Scan a label
        </Link>
      </div>
    </div>
  );
}
