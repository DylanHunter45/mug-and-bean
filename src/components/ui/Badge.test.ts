import { describe, expect, it } from "vitest";

import { badgeClasses } from "./Badge";

describe("badgeClasses", () => {
  it("defaults to the neutral tone", () => {
    const classes = badgeClasses();
    expect(classes).toContain("text-ink-soft");
    expect(classes).toContain("font-mono");
  });

  it("maps each tone to its accent text colour", () => {
    expect(badgeClasses({ tone: "cherry" })).toContain("text-cherry-deep");
    expect(badgeClasses({ tone: "survey" })).toContain("text-survey");
    // brass uses brass-DEEP for AA-legible text (plain brass fails on paper)
    expect(badgeClasses({ tone: "brass" })).toContain("text-brass-deep");
    expect(badgeClasses({ tone: "brass" })).not.toContain("text-brass ");
  });

  it("appends a caller-supplied className last", () => {
    expect(badgeClasses({ className: "ml-2" })).toMatch(/ml-2$/);
  });
});
