# Mug & Bean Component Library

Reusable, accessible UI primitives built on the **"Origin Ledger"**
design system (see [`DESIGN.md`](../../DESIGN.md)). Tokens are defined as CSS variables in
[`globals.css`](../app/globals.css) and exposed through
[`tailwind.config.ts`](../../tailwind.config.ts); components reference the
**semantic** names so the palette can evolve without edits here.

Import from the barrel:

```tsx
import { Button, Input, Badge, Container, Section } from "@/components/ui";
```

---

## Design tokens

| Token group  | Values                                                                                                                           | Notes                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Surfaces     | `paper` `surface` `surface-2` `line`                                                                                             | Warm latte-paper page → warm off-white cards → input wells → hairlines.   |
| Text         | `ink` (primary) · `ink-soft` (secondary body) · `muted` (labels/captions)                                                        | Use as `text-*`.                                                          |
| Accents      | `cherry` / `cherry-deep` (fruit/brand) · `survey` (place/altitude) · `brass` (sweet)                                             | Accent **text** = `cherry-deep`/`survey`; fills carry white text.         |
| Fonts        | `font-sans` (Hanken Grotesk) · `font-display` (Fraunces, serif) · `font-mono` (IBM Plex Mono)                                    | Mono is the **data voice**: scores, specs, catalogue nºs.                 |
| Display text | `text-display-lg` `text-display` `text-display-sm` `text-eyebrow`                                                                | Serif headline scale with tuned tracking; `display-lg` is fluid.          |
| Section pad  | `py-section-y` (80px) · `lg:py-section-y-lg` (128px)                                                                             | Used by `<Section>`.                                                      |
| Radius       | `rounded-card` (1.25rem)                                                                                                         | Panels. Controls use `rounded-full`.                                      |
| Shadow       | `shadow-card` · `shadow-glow`                                                                                                    | Light-theme lift; `glow` is the cherry hover halo.                        |
| Motion       | `.reveal` (+ inline `animationDelay`) · `animate-reveal` · brew loops (`animate-drip/brew/stream/press/pour/steam/flame/needle`) | Page-load rise + the landing brew-diagram loops. All reduced-motion safe. |
| Motifs       | `.topo` (contour rings) · `.ledger-rule` (ruled archive lines)                                                                   | Cartographic textures; pair decorative use with `aria-hidden`.            |

### Accessibility / contrast

Every text/background pairing used by these components passes **WCAG AA**
(≥4.5:1 for body text). Verified ratios on warm `paper`: ink ~12:1, ink-soft
~6.5:1, muted ~4.7:1, cherry-deep ~6.5:1, survey ~5.7:1; and **white** text on
`cherry`/`survey` fills (~5.8:1 / ~6.5:1) is used for accent buttons and filled
chips. Every interactive element has a visible `focus-visible` ring
(`ring-cherry`). Motion respects `prefers-reduced-motion`. Verify with axe /
Lighthouse.

---

## Components

### `Button`

Props: `variant` (`primary` | `secondary` | `ghost`, default `primary`),
`size` (`sm` | `md` | `lg`, default `md`), plus all native `<button>` attributes.

```tsx
<Button onClick={save}>Save coffee</Button>
<Button variant="secondary" size="lg">Cancel</Button>
<Button variant="ghost" size="sm" disabled>Loading…</Button>
```

For a link that **looks** like a button, use `buttonClasses()` on a `<Link>` /
`<a>` so the element stays semantically correct:

```tsx
import Link from "next/link";
import { buttonClasses } from "@/components/ui";

<Link href="/signup" className={buttonClasses({ variant: "secondary" })}>
  Create account
</Link>;
```

### `Input`

Forwards a ref (works in client-side controlled forms). Pass `invalid` for the
error state (sets `aria-invalid`). Always associate a `<label>`:

```tsx
<label className="flex flex-col gap-1 text-sm font-medium text-ink">
  Email
  <Input type="email" name="email" autoComplete="email" required />
</label>

<Input invalid aria-describedby="email-err" />
<p id="email-err" className="text-sm text-red-700">Enter a valid email.</p>
```

### `Badge`

A mono "spec label" pill, like a field on a catalogue card. `tone`: `neutral` |
`cherry` | `survey` | `brass` (flavour families: fruit / place / sweet).

```tsx
<Badge tone="cherry">Blackcurrant</Badge>
<Badge tone="survey">Jasmine</Badge>
<Badge tone="brass">Brown sugar</Badge>
```

### `Container`

Centres content, caps width (`max-w-6xl`), applies responsive gutters
(`px-6 sm:px-8`).

```tsx
<Container>
  <h2 className="text-display-sm">My Coffees</h2>
</Container>
```

### `Section`

Full-width band with vertical rhythm. Compose with `Container`:

```tsx
<Section className="border-t border-line/60">
  <Container>{/* … */}</Container>
</Section>
```

---

## Responsiveness

Components are fluid and verified at the three target breakpoints — **375px
(mobile)**, **768px (tablet)**, **1280px (desktop)**. `display-lg` uses a
`clamp()` so the hero headline scales without breakpoints; `Container` caps
width and adjusts gutters; `Section` increases vertical padding from `lg:` up.
Buttons and inputs are full-width-friendly (add `w-full`) for stacked mobile
forms.
