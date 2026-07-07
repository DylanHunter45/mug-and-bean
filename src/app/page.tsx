import type { CSSProperties } from "react";

import Link from "next/link";

import { BrewShowcase } from "@/components/landing/BrewDiagram";
import { CuppingGauge } from "@/components/landing/CuppingGauge";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import { Badge, Container, Section, buttonClasses } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";

/* The core loop — a real ordered sequence, drawn as waypoints on a route. */
const ROUTE = [
  {
    mark: "S",
    title: "Scan",
    body: "Point your camera at a bag. We read the roaster, origin, process, and tasting notes straight off the label.",
  },
  {
    mark: "R",
    title: "Rate",
    body: "Log the brew and score the cup. Every bag becomes a dated, searchable entry in your cellar.",
  },
  {
    mark: "D",
    title: "Discover",
    body: "Your ratings teach the app your palate, then point you toward the next coffee worth buying.",
  },
];

/* Sample specimen powering the hero — exactly what the app captures per bag. */
const SPECS = [
  ["Process", "Washed"],
  ["Varietal", "Red Bourbon"],
  ["Roast", "Filter"],
  ["Harvest", "2025"],
];

/* Flavour notes on the specimen card — tones map to flavour families. */
const FLAVOURS: { tone: BadgeTone; label: string }[] = [
  { tone: "cherry", label: "Blackcurrant" },
  { tone: "brass", label: "Brown sugar" },
  { tone: "survey", label: "Jasmine" },
];

/* A few catalogue rows — the payoff, shown as a ruled archive ledger. */
const CATALOGUE = [
  {
    no: "014",
    coffee: "Gatare",
    roaster: "Æther Roasters",
    origin: "Rwanda · Nyamasheke",
    alt: "1,950",
    score: "92.4",
  },
  {
    no: "013",
    coffee: "Los Nogales",
    roaster: "Passenger",
    origin: "Colombia · Huila",
    alt: "1,750",
    score: "90.1",
  },
  {
    no: "012",
    coffee: "Idido",
    roaster: "Onyx",
    origin: "Ethiopia · Yirgacheffe",
    alt: "2,100",
    score: "93.2",
  },
];

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      Mug<span className="text-cherry">&amp;</span>Bean
    </span>
  );
}

export default function Home() {
  return (
    <main>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/80 backdrop-blur">
        <Container className="flex items-center justify-between py-4">
          <Wordmark className="font-display text-2xl font-semibold tracking-tight text-ink" />
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className={buttonClasses({ variant: "ghost", size: "md" })}
            >
              Sign in
            </Link>
            <Link
              href="#waitlist"
              data-cta="nav"
              className={buttonClasses({ size: "md" })}
            >
              Join the waitlist
            </Link>
          </nav>
        </Container>
      </header>

      {/* Hero — sized to fit the first screen; a live specimen card over faint
          contours. min-h fills the viewport (minus header) and centers. */}
      <section className="relative flex flex-col overflow-hidden pb-12 pt-8 sm:pb-14 lg:min-h-[calc(100svh-3.75rem)] lg:justify-center lg:py-8">
        <Container className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="flex flex-col items-start gap-6">
            <Badge tone="cherry" className="reveal">
              <span className="h-1.5 w-1.5 rounded-full bg-cherry" />
              Early access · launching 2026
            </Badge>

            <h1
              className="reveal text-display-lg font-semibold text-ink"
              style={{ animationDelay: "80ms" }}
            >
              Catalogue every coffee
              <br />
              <span className="text-cherry">worth remembering.</span>
            </h1>

            <p
              className="reveal max-w-xl text-lg leading-relaxed text-ink-soft"
              style={{ animationDelay: "160ms" }}
            >
              Scan the bag, log the brew, score the cup. Mug &amp; Bean keeps a
              proper archive of the specialty coffee you drink — origin,
              altitude, process, and how the cup actually scored — and learns
              your palate as the entries pile up.
            </p>

            <div
              className="reveal flex flex-wrap items-center gap-3"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                href="#waitlist"
                data-cta="hero"
                className={buttonClasses({ size: "lg" })}
              >
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
              className="reveal font-mono text-xs uppercase tracking-[0.16em] text-muted"
              style={{ animationDelay: "320ms" }}
            >
              <span className="text-cherry-deep">500</span> founding tasters ·
              free to keep
            </p>
          </div>

          <div className="relative">
            {/* Contour rings — topographic elevation motif behind the card. */}
            <div
              aria-hidden
              className="topo animate-drift pointer-events-none absolute -right-20 -top-24 hidden h-[30rem] w-[30rem] opacity-70 [--topo-x:62%] [--topo-y:38%] [mask-image:radial-gradient(circle_at_62%_38%,black,transparent_68%)] sm:block"
            />
            <SpecimenCard />
          </div>
        </Container>
      </section>

      {/* The loop as a cartographic route, paired with a brewing field diagram. */}
      <Section className="border-t border-line/70">
        <Container className="grid gap-12 lg:grid-cols-[1fr_0.72fr] lg:items-center lg:gap-16">
          <div className="flex flex-col gap-10">
            <h2 className="max-w-xl text-display-sm font-semibold text-ink">
              Three moves, then the cellar does the thinking.
            </h2>

            <ol className="relative flex flex-col gap-8">
              {/* Dashed survey trail threading the waypoints. */}
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-4 left-[0.6875rem] top-4 border-l border-dashed border-survey/45"
              />
              {ROUTE.map(({ mark, title, body }) => (
                <li key={title} className="relative flex items-start gap-5">
                  <span className="relative z-10 mt-0.5 flex h-[1.375rem] w-[1.375rem] shrink-0 items-center justify-center rounded-full border-[1.5px] border-survey bg-paper font-mono text-[0.7rem] font-semibold text-survey">
                    {mark}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-xl font-semibold text-ink">{title}</h3>
                    <p className="max-w-md text-[0.95rem] leading-relaxed text-ink-soft">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <BrewShowcase className="reveal" />
        </Container>
      </Section>

      {/* The catalogue — payoff shown as a ruled archive ledger. */}
      <Section className="border-t border-line/70">
        <Container className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h2 className="max-w-2xl text-display-sm font-semibold text-ink">
              A shelf you can actually search.
            </h2>
            <p className="max-w-xl text-ink-soft">
              Bags get finished and forgotten. Here, every one stays on the
              record — sortable by roaster, origin, altitude, or score.
            </p>
          </div>

          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
            <div>
              {/* Header row */}
              <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-4 border-b border-line bg-surface-2/50 px-5 py-3.5 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted sm:grid-cols-[3.5rem_1.4fr_1fr_5rem_4rem] sm:px-7">
                <span>Nº</span>
                <span>Coffee</span>
                <span className="hidden sm:block">Origin</span>
                <span className="hidden text-right sm:block">masl</span>
                <span className="text-right">Score</span>
              </div>
              {CATALOGUE.map(({ no, coffee, roaster, origin, alt, score }) => (
                <div
                  key={no}
                  className="group grid grid-cols-[3rem_1fr_auto] items-center gap-4 border-b border-line/70 px-5 py-4 transition-colors last:border-b-0 hover:bg-surface-2 sm:grid-cols-[3.5rem_1.4fr_1fr_5rem_4rem] sm:px-7"
                >
                  <span className="font-mono text-sm text-muted transition-colors group-hover:text-cherry-deep">
                    {no}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-display text-lg font-semibold leading-tight text-ink transition-transform duration-200 ease-out group-hover:translate-x-1">
                      {coffee}
                    </span>
                    <span className="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-survey">
                      {roaster}
                    </span>
                  </span>
                  <span className="hidden text-sm text-ink-soft sm:block">
                    {origin}
                  </span>
                  <span className="hidden text-right font-mono text-sm text-ink-soft sm:block">
                    {alt}
                  </span>
                  <span className="text-right font-mono text-base font-semibold text-cherry-deep">
                    {score}
                  </span>
                </div>
              ))}
              {/* The next line in the ledger is the visitor's. */}
              <Link
                href="#waitlist"
                data-cta="catalogue"
                className="group grid grid-cols-[3rem_1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2 sm:grid-cols-[3.5rem_1.4fr_1fr_5rem_4rem] sm:px-7"
              >
                <span className="font-mono text-sm text-muted transition-colors group-hover:text-cherry-deep">
                  015
                </span>
                <span className="flex flex-col">
                  <span className="font-display text-lg font-semibold italic leading-tight text-muted transition-transform duration-200 ease-out group-hover:translate-x-1">
                    Your first entry
                  </span>
                  <span className="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-cherry-deep">
                    join the waitlist →
                  </span>
                </span>
                <span className="hidden text-sm text-muted sm:block">—</span>
                <span className="hidden text-right font-mono text-sm text-muted sm:block">
                  —
                </span>
                <span className="text-right font-mono text-base text-muted">
                  ·
                </span>
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      {/* Closing CTA — the email capture the Hero CTAs scroll to. scroll-mt
          clears the sticky header when jumped to via #waitlist. */}
      <Section id="waitlist" className="scroll-mt-24 border-t border-line/70">
        <Container>
          <div className="relative overflow-hidden rounded-card border border-line bg-surface px-6 py-14 text-center shadow-card">
            <div
              aria-hidden
              className="topo animate-drift pointer-events-none absolute inset-0 opacity-50 [--topo-x:50%] [--topo-y:120%] [mask-image:radial-gradient(circle_at_50%_120%,black,transparent_70%)]"
            />
            <div className="relative flex flex-col items-center gap-6">
              <span className="font-mono text-xs uppercase tracking-[0.16em] text-cherry-deep">
                Early access · 500 founding spots
              </span>
              <h2 className="max-w-xl text-display-sm font-semibold text-ink">
                Be among the first to shelve a coffee.
              </h2>
              <p className="max-w-md text-ink-soft">
                Early tasters get first access when Mug &amp; Bean opens, plus a
                founding spot in the cellar. Free to keep.
              </p>
              <div className="flex w-full justify-center pt-1">
                <WaitlistForm />
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <footer className="border-t border-line/70 py-8">
        <Container className="flex flex-col items-center justify-between gap-2 text-sm text-muted sm:flex-row">
          <Wordmark className="font-display text-base font-semibold text-ink" />
          <span>© 2026 · Your digital coffee cellar</span>
        </Container>
      </footer>
    </main>
  );
}

/* An altitude cross-section — turns a spec into a place. Decorative. */
function ElevationProfile() {
  const ridge =
    "M0,40 L30,32 L62,36 L96,21 L128,27 L155,9 L188,23 L222,16 L258,28 L300,23";
  return (
    <svg
      viewBox="0 0 300 48"
      preserveAspectRatio="none"
      className="h-11 w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="elev" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(47 96 118)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="rgb(47 96 118)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${ridge} L300,48 L0,48 Z`} fill="url(#elev)" />
      <path
        className="animate-draw"
        style={{ "--draw-len": 320 } as CSSProperties}
        d={ridge}
        fill="none"
        stroke="rgb(47 96 118)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="155" cy="9" r="2.75" fill="rgb(184 55 49)" />
    </svg>
  );
}

/* The signature element: the app's value as a catalogued specimen card. */
function SpecimenCard() {
  return (
    <div
      className="reveal relative rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
      style={{ animationDelay: "200ms" }}
    >
      <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.16em] text-muted">
        <span>Cellar entry</span>
        <span>Nº 014</span>
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-survey">
          Æther Roasters
        </span>
        <h2 className="font-display text-3xl font-semibold text-ink">Gatare</h2>
        <span className="text-ink-soft">Rwanda · Nyamasheke</span>
      </div>

      {/* Elevation band — the cartographic signature. */}
      <div className="mt-4 rounded-xl border border-line bg-surface-2/60 px-4 pb-2 pt-3">
        <div className="flex items-center justify-between font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
          <span>Elevation</span>
          <span className="text-ink">1,950 masl</span>
        </div>
        <ElevationProfile />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {SPECS.map(([label, value]) => (
          <div key={label} className="bg-surface px-4 py-2.5">
            <dt className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
              {label}
            </dt>
            <dd className="mt-0.5 text-sm text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <div className="flex items-center gap-4">
          <CuppingGauge score={92.4} size={76} />
          <div className="flex flex-col">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
              Cupping score
            </span>
            <span className="font-mono text-sm text-ink-soft">/100 scale</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
            Your rating
          </span>
          <span className="text-cherry" aria-label="Rated 4 out of 5">
            {"★★★★"}
            <span className="text-line">★</span>
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FLAVOURS.map(({ tone, label }, i) => (
          <Badge
            key={label}
            tone={tone}
            className="reveal transition-transform duration-200 ease-out hover:-translate-y-0.5"
            style={{ animationDelay: `${380 + i * 90}ms` }}
          >
            {label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
