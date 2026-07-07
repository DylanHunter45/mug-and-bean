import type { Config } from "tailwindcss";

/**
 * Mug & Bean design tokens — "Origin Ledger" system.
 *
 * A warm cartographic archive: soft latte-paper ground, warm espresso ink, a
 * single pressed cherry-red flavour accent, survey-teal for the map/altitude
 * motifs, and monospace for any data (scores, altitude, ratios). Warm and easy
 * on the eyes — never harsh pure white — while still avoiding dark "instrument"
 * chrome, the brown/kraft "artisan" costume, and generic SaaS.
 *
 * Colours resolve through CSS variables (defined in globals.css) using the
 * `rgb(var(--x) / <alpha-value>)` pattern so opacity modifiers like
 * `bg-cherry/10` work. Reference the semantic names below, never raw hex.
 *
 * Contrast (verified on warm paper, WCAG AA): ink ~12:1, ink-soft ~6.5:1,
 * muted ~4.7:1, cherry-deep ~6.5:1, survey ~5.7:1; accent FILLS carry white
 * text (white-on-cherry ~5.8:1, white-on-survey ~6.5:1).
 */
const withAlpha = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: withAlpha("--paper"),
        surface: withAlpha("--surface"),
        "surface-2": withAlpha("--surface-2"),
        line: withAlpha("--line"),
        ink: withAlpha("--ink"),
        "ink-soft": withAlpha("--ink-soft"),
        muted: withAlpha("--muted"),
        cherry: withAlpha("--cherry"),
        "cherry-deep": withAlpha("--cherry-deep"),
        survey: withAlpha("--survey"),
        brass: withAlpha("--brass"),
        "brass-deep": withAlpha("--brass-deep"),
      },
      fontFamily: {
        // Body / UI — a clean humanist grotesque (not Inter).
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Display / headlines — an editorial serif with character (Fraunces).
        display: ["var(--font-display)", "Georgia", "serif"],
        // Data voice — cupping scores, altitude, ratios, catalogue numbers.
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Display scale (size, { lineHeight, letterSpacing }).
        "display-sm": [
          "2.25rem",
          { lineHeight: "1.05", letterSpacing: "-0.02em" },
        ],
        display: ["3.25rem", { lineHeight: "1", letterSpacing: "-0.03em" }],
        "display-lg": [
          "clamp(2.75rem, 6.5vw, 5.25rem)",
          { lineHeight: "1.0", letterSpacing: "-0.035em" },
        ],
        // Mono spec / catalogue label.
        eyebrow: ["0.72rem", { lineHeight: "1", letterSpacing: "0.2em" }],
      },
      spacing: {
        // Kept modest: every Section pads top AND bottom, so adjacent sections
        // already stack to ~2× this between them. 40/64 → ~80/128px gaps.
        "section-y": "2.5rem", // 40px — mobile section rhythm
        "section-y-lg": "4rem", // 64px — desktop
      },
      borderRadius: {
        card: "1.25rem", // panels / cards
      },
      boxShadow: {
        // Warm, soft lift: a faint hairline + a gentle espresso-toned drop.
        card: "0 1px 2px rgb(var(--ink) / 0.03), 0 18px 40px -28px rgb(var(--ink) / 0.18)",
        // Cherry hover lift for primary actions.
        glow: "0 10px 28px -14px rgb(var(--cherry) / 0.45)",
      },
      keyframes: {
        reveal: {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        reveal: "reveal 0.7s cubic-bezier(0.2,0.7,0.2,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
