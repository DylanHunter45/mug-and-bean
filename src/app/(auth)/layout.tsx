/**
 * Layout for the (auth) route group (login / signup).
 *
 * `(auth)` is a route group - it shares this centered card layout without
 * adding a `/auth` segment to the URLs (pages stay at `/login`, `/signup`).
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-display text-3xl font-semibold tracking-tight text-ink">
          Mug<span className="text-cherry">&amp;</span>Bean
        </span>
        <p className="text-lg text-muted">Your digital coffee cellar.</p>
      </div>
      {children}
    </main>
  );
}
