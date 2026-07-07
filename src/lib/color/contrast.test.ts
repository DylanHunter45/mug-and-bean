import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  AA_NON_TEXT,
  AA_NORMAL,
  compositeOver,
  contrastRatio,
  meetsContrast,
  relativeLuminance,
  type RGB,
} from "./contrast";

/**
 * Parse the "Origin Ledger" design tokens straight out of globals.css so this
 * suite verifies the *shipped* palette. If someone retunes a token to a value
 * that breaks WCAG AA, the corresponding assertion below fails in CI.
 */
function loadTokens(): Record<string, RGB> {
  const cssPath = fileURLToPath(
    new URL("../../app/globals.css", import.meta.url),
  );
  const css = readFileSync(cssPath, "utf8");
  const tokens: Record<string, RGB> = {};
  // Matches lines like:  --cherry: 180 58 47; /* … */
  const re = /--([a-z0-9-]+):\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*;/g;
  for (const [, name, r, g, b] of css.matchAll(re)) {
    tokens[name] = [Number(r), Number(g), Number(b)];
  }
  return tokens;
}

const t = loadTokens();

describe("relativeLuminance", () => {
  it("anchors black at 0 and white at 1", () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
  });
});

describe("contrastRatio", () => {
  it("is 21:1 for black on white and order-independent", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 5);
  });
  it("is 1:1 for a colour on itself", () => {
    expect(contrastRatio([180, 58, 47], [180, 58, 47])).toBeCloseTo(1, 5);
  });
});

describe("Origin Ledger tokens all parse", () => {
  it("finds every semantic colour token", () => {
    for (const name of [
      "paper",
      "surface",
      "surface-2",
      "line",
      "ink",
      "ink-soft",
      "muted",
      "cherry",
      "cherry-deep",
      "survey",
      "brass",
      "brass-deep",
    ]) {
      expect(t[name], `token --${name} missing from globals.css`).toBeDefined();
    }
  });
});

const white: RGB = [255, 255, 255];
// The three light grounds text is set on. `paper` is the darkest of them, so it
// is the worst case for dark-on-light text; assert against all three anyway.
const grounds = () =>
  [
    ["paper", t.paper],
    ["surface", t.surface],
    ["surface-2", t["surface-2"]],
  ] as const;

describe("body & label text meets WCAG AA (normal text, 4.5:1)", () => {
  const textTokens = ["ink", "ink-soft", "muted"] as const;
  for (const text of textTokens) {
    for (const [groundName, ground] of grounds()) {
      it(`${text} on ${groundName}`, () => {
        const ratio = contrastRatio(t[text], ground);
        expect(
          meetsContrast(ratio, AA_NORMAL),
          `${text}-on-${groundName} = ${ratio.toFixed(2)}:1`,
        ).toBe(true);
      });
    }
  }
});

describe("accent text meets WCAG AA (normal text, 4.5:1)", () => {
  // Accents used as *text* on the page ground (README: cherry-deep / survey).
  for (const text of ["cherry-deep", "survey"] as const) {
    it(`${text} on paper`, () => {
      const ratio = contrastRatio(t[text], t.paper);
      expect(
        meetsContrast(ratio, AA_NORMAL),
        `${text}-on-paper = ${ratio.toFixed(2)}:1`,
      ).toBe(true);
    });
  }

  // The Badge `brass` tone draws brass-deep text over an 8% brass tint on the
  // page ground — assert against that composited background, the true worst
  // case. (Plain `brass` is reserved for fills/decoration, not text.)
  it("brass-deep on the brass-tinted badge fill", () => {
    const badgeBg = compositeOver(t.brass, 0.08, t.paper);
    const ratio = contrastRatio(t["brass-deep"], badgeBg);
    expect(
      meetsContrast(ratio, AA_NORMAL),
      `brass-deep-on-badge = ${ratio.toFixed(2)}:1`,
    ).toBe(true);
  });
});

describe("accent fills carry white text at WCAG AA", () => {
  for (const fill of ["cherry", "cherry-deep", "survey"] as const) {
    it(`white on ${fill}`, () => {
      const ratio = contrastRatio(white, t[fill]);
      expect(
        meetsContrast(ratio, AA_NORMAL),
        `white-on-${fill} = ${ratio.toFixed(2)}:1`,
      ).toBe(true);
    });
  }
});

describe("non-text UI meets WCAG AA (3:1)", () => {
  it("focus ring (cherry) is distinguishable from paper", () => {
    const ratio = contrastRatio(t.cherry, t.paper);
    expect(
      meetsContrast(ratio, AA_NON_TEXT),
      `cherry-on-paper = ${ratio.toFixed(2)}:1`,
    ).toBe(true);
  });
});
