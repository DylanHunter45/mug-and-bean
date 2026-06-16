import type { Config } from "tailwindcss";

/**
 * Mug & Bean design tokens — "Cupping Table" system.
 *
 * The brand reads coffee as something *measured*: a dark-roast canvas, raw
 * green-bean jade as the primary accent, amber for extraction highlights, and
 * monospace for any data (scores, altitude, ratios). This is a deliberate move
 * away from the warm-cream / brown-serif coffee cliché.
 *
 * Colours resolve through CSS variables (defined in globals.css) using the
 * `rgb(var(--x) / <alpha-value>)` pattern so opacity modifiers like
 * `bg-jade/15` work. Reference the semantic names below, never raw hex.
 *
 * Contrast: every text/background pairing passes WCAG AA (verified) — e.g.
 * cream/canvas 16:1, muted/canvas 6.6:1, jade/canvas 8.7:1, amber/canvas
 * 8.6:1, and canvas-on-jade/amber fills 8.6:1 for accent buttons.
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
        canvas: withAlpha("--canvas"),
        surface: withAlpha("--surface"),
        "surface-2": withAlpha("--surface-2"),
        line: withAlpha("--line"),
        cream: withAlpha("--cream"),
        muted: withAlpha("--muted"),
        "muted-bright": withAlpha("--muted-bright"),
        jade: withAlpha("--jade"),
        "jade-bright": withAlpha("--jade-bright"),
        amber: withAlpha("--amber"),
      },
      fontFamily: {
        // Body / UI — a clean humanist grotesque (not Inter).
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Display / headlines — a contemporary, idiosyncratic grotesque.
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        // Data voice — cupping scores, altitude, ratios, eyebrow labels.
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
          "clamp(3rem, 7vw, 5.5rem)",
          { lineHeight: "0.98", letterSpacing: "-0.035em" },
        ],
        // Mono eyebrow / kicker label.
        eyebrow: ["0.72rem", { lineHeight: "1", letterSpacing: "0.22em" }],
      },
      spacing: {
        "section-y": "5rem", // 80px — mobile section rhythm
        "section-y-lg": "8rem", // 128px — desktop
      },
      borderRadius: {
        card: "1.25rem", // panels / cards
      },
      boxShadow: {
        card: "0 1px 0 rgb(var(--cream) / 0.04) inset, 0 24px 50px -24px rgb(0 0 0 / 0.7)",
        glow: "0 0 0 1px rgb(var(--jade) / 0.25), 0 16px 50px -18px rgb(var(--jade) / 0.45)",
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
