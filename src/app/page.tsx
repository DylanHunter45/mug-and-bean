import Link from "next/link";

import { CountUp } from "@/components/landing/CountUp";
import { Badge, Container, Section, buttonClasses } from "@/components/ui";

/* The core user loop — a real sequence, so the steps are numbered. */
const LOOP = [
  {
    step: "01",
    title: "Scan",
    body: "Point your camera at a bag. We read the roaster, origin, process, and tasting notes off the label.",
  },
  {
    step: "02",
    title: "Rate",
    body: "Log the brew and score the cup. Every bag becomes a dated entry in your cellar.",
  },
  {
    step: "03",
    title: "Discover",
    body: "Your ratings teach the app your palate, then point you at the next coffee worth buying.",
  },
];

/* Sample cellar entry powering the hero — shows exactly what the app captures. */
const SPECS = [
  ["Process", "Washed"],
  ["Altitude", "1,950 masl"],
  ["Varietal", "Red Bourbon"],
  ["Roast", "Filter"],
];

export default function Home() {
  return (
    <main>
      <header className="border-b border-line/60">
        <Container className="flex items-center justify-between py-5">
          <span className="font-mono text-sm font-medium uppercase tracking-[0.2em] text-cream">
            Mug<span className="text-jade">&amp;</span>Bean
          </span>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className={buttonClasses({ variant: "ghost", size: "sm" })}
            >
              Sign in
            </Link>
            <Link href="/signup" className={buttonClasses({ size: "sm" })}>
              Join waitlist
            </Link>
          </nav>
        </Container>
      </header>

      {/* Hero — headline thesis on the left, a live cellar entry on the right. */}
      <Section className="relative overflow-hidden">
        <Container className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col items-start gap-7">
            <Badge tone="jade" className="reveal">
              <span className="h-1.5 w-1.5 rounded-full bg-jade" />
              Early access · Phase 01
            </Badge>

            <h1
              className="reveal text-display-lg font-extrabold text-cream"
              style={{ animationDelay: "80ms" }}
            >
              Catalogue every coffee
              <br />
              <span className="text-jade">worth remembering.</span>
            </h1>

            <p
              className="reveal max-w-xl text-lg leading-relaxed text-muted-bright"
              style={{ animationDelay: "160ms" }}
            >
              Scan the bag, log the brew, score the cup. Mug &amp; Bean turns a
              coffee habit into a searchable cellar — and learns your palate as
              the entries pile up.
            </p>

            <div
              className="reveal flex flex-wrap items-center gap-3"
              style={{ animationDelay: "240ms" }}
            >
              <Link href="/signup" className={buttonClasses({ size: "lg" })}>
                Join the waitlist
              </Link>
              <Link
                href="/login"
                className={buttonClasses({ variant: "secondary", size: "lg" })}
              >
                Sign in
              </Link>
            </div>

            <p
              className="reveal font-mono text-xs uppercase tracking-[0.18em] text-muted"
              style={{ animationDelay: "320ms" }}
            >
              <span className="text-jade">500</span> founding tasters ·
              launching 2026
            </p>
          </div>

          <CellarEntry />
        </Container>
      </Section>

      {/* The loop — the three-step core flow. */}
      <Section className="border-t border-line/60">
        <Container className="flex flex-col gap-12">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-eyebrow uppercase text-jade">
              The loop
            </span>
            <h2 className="max-w-2xl text-display-sm font-bold text-cream">
              Three steps, then the cellar does the thinking.
            </h2>
          </div>

          <ol className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
            {LOOP.map(({ step, title, body }) => (
              <li
                key={step}
                className="flex flex-col gap-4 bg-surface p-7 transition-colors hover:bg-surface-2"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-sm text-jade">{step}</span>
                  <span className="h-px w-10 bg-line" />
                </div>
                <h3 className="text-2xl font-semibold text-cream">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-bright">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Closing CTA. */}
      <Section className="border-t border-line/60">
        <Container>
          <div className="ruled flex flex-col items-center gap-6 rounded-card border border-line bg-surface/60 px-6 py-14 text-center shadow-card">
            <h2 className="max-w-xl text-display-sm font-bold text-cream">
              Be among the first to shelve a coffee.
            </h2>
            <p className="max-w-md text-muted-bright">
              Early tasters get first access when Mug &amp; Bean opens, plus a
              founding spot in the cellar.
            </p>
            <Link href="/signup" className={buttonClasses({ size: "lg" })}>
              Join the waitlist
            </Link>
          </div>
        </Container>
      </Section>

      <footer className="border-t border-line/60 py-8">
        <Container className="flex flex-col items-center justify-between gap-2 text-sm text-muted sm:flex-row">
          <span className="font-mono uppercase tracking-[0.18em]">
            Mug<span className="text-jade">&amp;</span>Bean
          </span>
          <span>© 2026 · Your digital coffee cellar</span>
        </Container>
      </footer>
    </main>
  );
}

/* The signature element: the app's value shown as a scored cellar entry. */
function CellarEntry() {
  return (
    <div
      className="reveal relative rounded-card border border-line bg-surface p-6 shadow-card sm:p-8"
      style={{ animationDelay: "200ms" }}
    >
      <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.18em] text-muted">
        <span>Cellar entry</span>
        <span>Nº 014</span>
      </div>

      <div className="mt-6 flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-amber">
          Æther Roasters
        </span>
        <h2 className="text-4xl font-bold text-cream">Gatare</h2>
        <span className="text-muted-bright">Rwanda · Nyamasheke</span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {SPECS.map(([label, value]) => (
          <div key={label} className="bg-surface-2 px-4 py-3">
            <dt className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">
              {label}
            </dt>
            <dd className="mt-0.5 text-sm text-cream">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex items-end justify-between border-t border-line pt-6">
        <div>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">
            Cupping score
          </span>
          <div className="flex items-baseline gap-1">
            <CountUp
              value={92.4}
              decimals={1}
              className="font-display text-5xl font-extrabold text-jade"
            />
            <span className="font-mono text-sm text-muted">/100</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">
            Your rating
          </span>
          <span className="text-jade" aria-label="Rated 4 out of 5">
            {"★★★★"}
            <span className="text-line">★</span>
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Badge tone="jade">Blackcurrant</Badge>
        <Badge tone="amber">Jasmine</Badge>
        <Badge>Brown sugar</Badge>
      </div>
    </div>
  );
}
