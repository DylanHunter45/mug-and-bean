# Mug & Bean Component Library

Reusable, accessible UI primitives built on the **"Cupping Table"**
design system. Tokens are defined as CSS variables in
[`globals.css`](../app/globals.css) and exposed through
[`tailwind.config.ts`](../../tailwind.config.ts); components reference the
**semantic** names so the palette can evolve without edits here.

Import from the barrel:

```tsx
import { Button, Input, Badge, Container, Section } from "@/components/ui";
```

---

## Design tokens

| Token group  | Values                                                                                   | Notes                                                       |
| ------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Surfaces     | `canvas` `surface` `surface-2` `line`                                                    | Dark-roast canvas → raised cards → inputs → hairline rules. |
| Text         | `cream` (primary) · `muted` / `muted-bright` (secondary)                                 | Use as `text-*`.                                            |
| Accents      | `jade` / `jade-bright` (primary) · `amber` (secondary)                                   | Jade = green coffee; amber = extraction. Use sparingly.     |
| Fonts        | `font-sans` (Hanken Grotesk) · `font-display` (Bricolage) · `font-mono` (JetBrains Mono) | Mono is the **data voice**: scores, specs, eyebrows.        |
| Display text | `text-display-lg` `text-display` `text-display-sm` `text-eyebrow`                        | Headline scale with tuned tracking; `display-lg` is fluid.  |
| Section pad  | `py-section-y` (80px) · `lg:py-section-y-lg` (128px)                                     | Used by `<Section>`.                                        |
| Radius       | `rounded-card` (1.25rem)                                                                 | Panels. Controls use `rounded-full`.                        |
| Shadow       | `shadow-card` · `shadow-glow`                                                            | Elevation; `glow` is the jade hover halo.                   |
| Motion       | `.reveal` (+ inline `animationDelay`) · `animate-reveal`                                 | The one orchestrated page-load rise. Reduced-motion safe.   |
| Atmosphere   | `.ruled`                                                                                 | Faint cupping-form grid background.                         |

### Accessibility / contrast

Every text/background pairing used by these components passes **WCAG AA**
(≥4.5:1 for body text). Verified ratios on `canvas`: cream 16:1, muted 6.6:1,
jade 8.7:1, amber 8.6:1; and dark `canvas` text on jade/amber fills is 8.6:1
(used for accent buttons). Every interactive element has a visible
`focus-visible` ring (`ring-jade`). Motion respects `prefers-reduced-motion`.
Verify with axe / Lighthouse.

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
<label className="flex flex-col gap-1 text-sm font-medium text-cream">
  Email
  <Input type="email" name="email" autoComplete="email" required />
</label>

<Input invalid aria-describedby="email-err" />
<p id="email-err" className="text-sm text-red-300">Enter a valid email.</p>
```

### `Badge`

A mono "spec label" pill, like a field on a cupping card. `tone`: `neutral` |
`jade` | `amber`.

```tsx
<Badge tone="jade">Blackcurrant</Badge>
<Badge tone="amber">Jasmine</Badge>
<Badge>Brown sugar</Badge>
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
