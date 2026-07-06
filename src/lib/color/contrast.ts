/**
 * WCAG 2.1 relative-luminance and contrast-ratio math.
 *
 * Framework-agnostic (no React, no DOM) so it can back both the design-token
 * regression test and any future runtime a11y checks. The "Origin Ledger"
 * palette claims WCAG AA for every text/background pairing (see
 * `src/components/README.md`); `contrast.test.ts` parses the real tokens out of
 * `globals.css` and asserts those claims here, so a token edit that breaks
 * contrast fails CI rather than silently shipping.
 *
 * Reference: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance and #dfn-contrast-ratio
 */

export type RGB = readonly [number, number, number];

/** WCAG AA minimum contrast ratios. "Large" = ≥18.66px bold or ≥24px regular. */
export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;
/** UI component / graphical-object boundary (WCAG 1.4.11). */
export const AA_NON_TEXT = 3;

/** Linearise a single 0–255 sRGB channel (gamma-expanded). */
function linearise(channel8bit: number): number {
  const c = channel8bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of an opaque sRGB colour (0 = black, 1 = white). */
export function relativeLuminance([r, g, b]: RGB): number {
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/**
 * Contrast ratio between two opaque colours, 1:1 → 21:1. Order-independent.
 */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Alpha-composite `fg` (with alpha 0–1) over an opaque `bg`, returning the
 * resulting opaque colour. Used for tinted fills like a badge's `bg-x/[0.08]`,
 * whose effective background is the tint over the page — the worst case for the
 * text drawn on top.
 */
export function compositeOver(fg: RGB, alpha: number, bg: RGB): RGB {
  return [
    Math.round(fg[0] * alpha + bg[0] * (1 - alpha)),
    Math.round(fg[1] * alpha + bg[1] * (1 - alpha)),
    Math.round(fg[2] * alpha + bg[2] * (1 - alpha)),
  ];
}

/** True if `ratio` meets the given WCAG threshold (default AA normal text). */
export function meetsContrast(ratio: number, minimum = AA_NORMAL): boolean {
  // Round to 2dp first so a value like 4.499 that displays as "4.50" still
  // passes, matching how ratios are reported by axe / Lighthouse.
  return Math.round(ratio * 100) / 100 >= minimum;
}
