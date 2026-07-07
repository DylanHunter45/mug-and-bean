import type { Metadata } from "next";

import {
  Badge,
  Button,
  Container,
  Input,
  Section,
  buttonClasses,
} from "@/components/ui";
import type { BadgeTone, ButtonSize, ButtonVariant } from "@/components/ui";
import {
  AA_NORMAL,
  contrastRatio,
  meetsContrast,
  type RGB,
} from "@/lib/color/contrast";

/**
 * Component gallery / living style guide for the "Origin Ledger" base library.
 * A kitchen-sink of every primitive in every variant so the
 * components can be eyeballed at the three target breakpoints (375 / 768 /
 * 1280px — just resize) and audited with axe / Lighthouse against a single
 * page. Internal reference, kept out of search.
 */
export const metadata: Metadata = {
  title: "Component Library · Mug & Bean",
  robots: { index: false, follow: false },
};

/**
 * Token RGB values mirroring globals.css `:root`, so this page can render live
 * WCAG ratios via the same math the token regression test uses. The test
 * (src/lib/color/contrast.test.ts) is the source of truth that enforces AA;
 * this map is display-only.
 */
const TOKENS = {
  paper: [232, 220, 201],
  surface: [247, 240, 228],
  "surface-2": [224, 211, 190],
  line: [208, 193, 170],
  ink: [44, 35, 24],
  "ink-soft": [87, 73, 58],
  muted: [101, 88, 67],
  cherry: [180, 58, 47],
  "cherry-deep": [157, 42, 31],
  survey: [60, 98, 112],
  brass: [161, 122, 58],
  "brass-deep": [114, 83, 30],
} satisfies Record<string, RGB>;

const SURFACE_SWATCHES = ["paper", "surface", "surface-2", "line"] as const;
// Text tokens paired with the ground they are drawn on, for a live AA readout.
const TEXT_ON_PAPER = [
  "ink",
  "ink-soft",
  "muted",
  "cherry-deep",
  "survey",
  "brass-deep",
] as const;

const BUTTON_VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost"];
const BUTTON_SIZES: ButtonSize[] = ["sm", "md", "lg"];
const BADGE_TONES: BadgeTone[] = ["neutral", "cherry", "survey", "brass"];

const TYPE_SPECIMENS = [
  { cls: "text-display-lg", label: "display-lg", sample: "Origin Ledger" },
  { cls: "text-display", label: "display", sample: "Altitude & place" },
  { cls: "text-display-sm", label: "display-sm", sample: "My Coffees" },
  {
    cls: "font-mono text-eyebrow uppercase text-muted",
    label: "eyebrow (mono)",
    sample: "Nº 014 · Catalogue",
  },
  {
    cls: "text-base text-ink-soft",
    label: "body",
    sample: "Scan, rate, discover.",
  },
];

function ratioLabel(fg: RGB, bg: RGB): { text: string; pass: boolean } {
  const ratio = contrastRatio(fg, bg);
  return {
    text: `${ratio.toFixed(2)}:1`,
    pass: meetsContrast(ratio, AA_NORMAL),
  };
}

/** Section heading in the archive idiom: mono eyebrow + serif title. */
function Heading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-8 border-b border-line pb-4">
      <p className="font-mono text-eyebrow uppercase text-survey">{eyebrow}</p>
      <h2 className="mt-2 text-display-sm text-ink">{title}</h2>
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <main className="min-h-screen">
      <Section className="border-b border-line">
        <Container>
          <p className="font-mono text-eyebrow uppercase text-cherry-deep">
            Component Library
          </p>
          <h1 className="mt-3 text-display-lg text-ink">Origin Ledger</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            A living reference for the base UI primitives. Resize the window to
            verify behaviour at 375px (mobile), 768px (tablet), and 1280px
            (desktop). Every text/background pairing below is WCAG&nbsp;AA and
            enforced by{" "}
            <code className="font-mono text-sm text-cherry-deep">
              contrast.test.ts
            </code>
            .
          </p>
        </Container>
      </Section>

      {/* Colour tokens */}
      <Section>
        <Container>
          <Heading eyebrow="Palette" title="Colour tokens" />

          <h3 className="mb-3 font-mono text-eyebrow uppercase text-muted">
            Surfaces
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {SURFACE_SWATCHES.map((name) => (
              <div
                key={name}
                className="rounded-card border border-line bg-surface p-3"
              >
                <div
                  className="h-16 w-full rounded-lg border border-line"
                  style={{ background: `rgb(${TOKENS[name].join(" ")})` }}
                />
                <p className="mt-2 font-mono text-xs text-ink">{name}</p>
                <p className="font-mono text-[0.7rem] text-muted">
                  rgb({TOKENS[name].join(" ")})
                </p>
              </div>
            ))}
          </div>

          <h3 className="mb-3 mt-8 font-mono text-eyebrow uppercase text-muted">
            Text on paper — live AA ratio
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEXT_ON_PAPER.map((name) => {
              const { text, pass } = ratioLabel(TOKENS[name], TOKENS.paper);
              return (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border border-line bg-paper px-4 py-3"
                >
                  <span
                    className="font-medium"
                    style={{ color: `rgb(${TOKENS[name].join(" ")})` }}
                  >
                    {name}
                  </span>
                  <span className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-muted">{text}</span>
                    <span
                      className={pass ? "text-survey" : "text-cherry-deep"}
                      aria-label={pass ? "passes AA" : "fails AA"}
                    >
                      {pass ? "AA ✓" : "✕"}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* Typography */}
      <Section className="border-t border-line">
        <Container>
          <Heading eyebrow="Type" title="Typographic scale" />
          <div className="space-y-6">
            {TYPE_SPECIMENS.map(({ cls, label, sample }) => (
              <div
                key={label}
                className="flex flex-col gap-1 border-b border-line/60 pb-5 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <span className="w-40 shrink-0 font-mono text-eyebrow uppercase text-muted">
                  {label}
                </span>
                <span className={cls}>{sample}</span>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Buttons */}
      <Section className="border-t border-line">
        <Container>
          <Heading eyebrow="Controls" title="Button" />
          <div className="space-y-6">
            {BUTTON_VARIANTS.map((variant) => (
              <div key={variant} className="flex flex-wrap items-center gap-4">
                <span className="w-24 shrink-0 font-mono text-eyebrow uppercase text-muted">
                  {variant}
                </span>
                {BUTTON_SIZES.map((size) => (
                  <Button key={size} variant={variant} size={size}>
                    {size === "sm" ? "Save" : "Save coffee"}
                  </Button>
                ))}
                <Button variant={variant} disabled>
                  Disabled
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-4 border-t border-line/60 pt-6">
              <span className="w-24 shrink-0 font-mono text-eyebrow uppercase text-muted">
                as link
              </span>
              <a href="#" className={buttonClasses({ variant: "secondary" })}>
                buttonClasses() on an &lt;a&gt;
              </a>
            </div>
          </div>
        </Container>
      </Section>

      {/* Badges */}
      <Section className="border-t border-line">
        <Container>
          <Heading eyebrow="Data" title="Badge" />
          <div className="flex flex-wrap gap-3">
            {BADGE_TONES.map((tone) => (
              <Badge key={tone} tone={tone}>
                {tone}
              </Badge>
            ))}
          </div>
        </Container>
      </Section>

      {/* Inputs */}
      <Section className="border-t border-line">
        <Container>
          <Heading eyebrow="Forms" title="Input" />
          <div className="grid max-w-xl gap-6">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              Roaster
              <Input placeholder="e.g. Passenger Coffee" autoComplete="off" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              Email
              <Input
                type="email"
                defaultValue="not-an-email"
                invalid
                aria-describedby="sg-email-err"
              />
              <span
                id="sg-email-err"
                className="text-sm font-normal text-red-700"
              >
                Enter a valid email address.
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              Disabled
              <Input placeholder="Unavailable" disabled />
            </label>
          </div>
        </Container>
      </Section>

      {/* Layout primitives */}
      <Section className="border-t border-line">
        <Container>
          <Heading eyebrow="Layout" title="Container & Section" />
          <p className="max-w-2xl text-ink-soft">
            This whole page is composed of{" "}
            <code className="font-mono text-sm">Section</code> bands (vertical
            rhythm) wrapping a{" "}
            <code className="font-mono text-sm">Container</code> (max-width{" "}
            <span className="font-mono">6xl</span>, responsive gutters). The
            ruled band below shows a nested tinted surface.
          </p>
          <div className="mt-6 rounded-card border border-line bg-surface p-6 shadow-card">
            <p className="font-mono text-eyebrow uppercase text-muted">
              surface · shadow-card · rounded-card
            </p>
            <p className="mt-2 text-ink-soft">
              Cards, panels, and specimen sheets sit on this raised surface.
            </p>
          </div>
        </Container>
      </Section>
    </main>
  );
}
