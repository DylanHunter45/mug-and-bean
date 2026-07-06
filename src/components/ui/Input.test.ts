import { describe, expect, it } from "vitest";

import { inputClasses } from "./Input";

describe("inputClasses", () => {
  it("uses the resting (line) border by default", () => {
    const classes = inputClasses();
    expect(classes).toContain("border-line");
    expect(classes).toContain("focus-visible:border-cherry");
    expect(classes).not.toContain("border-red-600/60");
  });

  it("switches to the error border when invalid", () => {
    const classes = inputClasses({ invalid: true });
    expect(classes).toContain("border-red-600/60");
    expect(classes).not.toContain("border-line");
  });

  it("appends a caller-supplied className last", () => {
    expect(inputClasses({ className: "max-w-xs" })).toMatch(/max-w-xs$/);
  });
});
