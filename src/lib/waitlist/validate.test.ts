import { describe, expect, it } from "vitest";

import { isValidEmail, MAX_EMAIL_LENGTH, normalizeEmail } from "./validate";

describe("normalizeEmail", () => {
  it("trims surrounding whitespace and lower-cases", () => {
    expect(normalizeEmail("  Foo@Example.COM ")).toBe("foo@example.com");
  });

  it("leaves an already-normalised address unchanged", () => {
    expect(normalizeEmail("foo@example.com")).toBe("foo@example.com");
  });
});

describe("isValidEmail", () => {
  it.each([
    "person@example.com",
    "first.last@sub.domain.co",
    "user+tag@example.io",
    "  padded@example.com  ",
  ])("accepts %j", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    "",
    "   ",
    "not-an-email",
    "missing@domain",
    "@example.com",
    "spaces in@example.com",
    "two@@example.com",
  ])("rejects %j", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it("rejects an address longer than the RFC length cap", () => {
    const local = "a".repeat(MAX_EMAIL_LENGTH);
    expect(isValidEmail(`${local}@example.com`)).toBe(false);
  });
});
