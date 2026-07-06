import { describe, expect, it } from "vitest";

import { buttonClasses } from "./Button";

describe("buttonClasses", () => {
  it("defaults to the primary variant at medium size", () => {
    const classes = buttonClasses();
    expect(classes).toContain("bg-cherry");
    expect(classes).toContain("text-white");
    expect(classes).toContain("py-2.5");
  });

  it("applies the requested variant and size", () => {
    const classes = buttonClasses({ variant: "secondary", size: "lg" });
    expect(classes).toContain("border-line");
    expect(classes).toContain("text-base");
    expect(classes).not.toContain("bg-cherry");
  });

  it("appends a caller-supplied className last", () => {
    expect(buttonClasses({ className: "w-full" })).toMatch(/w-full$/);
  });
});
