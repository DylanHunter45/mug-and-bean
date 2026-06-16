/**
 * Protected app shell (/app/*).
 *
 * The root middleware already redirects unauthenticated traffic away from
 * `/app/*`, but this layout re-checks `getUser()` as defense-in-depth (never
 * trust the middleware alone for data access) and makes the authenticated user
 * available to the header. Children render below a bar with the user's email
 * and a sign-out button.
 */
import { redirect } from "next/navigation";

import { signOut } from "@/app/(auth)/actions";
import { LOGIN_PATH } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-line bg-surface/70 px-6 py-3">
        <span className="font-mono text-sm font-medium uppercase tracking-[0.2em] text-cream">
          Mug<span className="text-jade">&amp;</span>Bean
        </span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-cream transition-colors hover:border-jade/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
