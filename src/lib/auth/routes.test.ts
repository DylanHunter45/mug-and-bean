import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTHED_PATH,
  isProtectedPath,
  safeRedirectPath,
} from "./routes";

describe("isProtectedPath", () => {
  it("protects the /app root and its descendants", () => {
    expect(isProtectedPath("/app")).toBe(true);
    expect(isProtectedPath("/app/")).toBe(true);
    expect(isProtectedPath("/app/coffees")).toBe(true);
    expect(isProtectedPath("/app/coffees/123")).toBe(true);
  });

  it("does not protect public routes or lookalike prefixes", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/applesauce")).toBe(false); // not /app or /app/*
  });
});

describe("safeRedirectPath", () => {
  it("passes through same-origin absolute paths", () => {
    expect(safeRedirectPath("/app/coffees")).toBe("/app/coffees");
    expect(safeRedirectPath("/app?tab=cellar")).toBe("/app?tab=cellar");
  });

  it("falls back when the candidate is missing", () => {
    expect(safeRedirectPath(null)).toBe(DEFAULT_AUTHED_PATH);
    expect(safeRedirectPath(undefined)).toBe(DEFAULT_AUTHED_PATH);
    expect(safeRedirectPath("")).toBe(DEFAULT_AUTHED_PATH);
  });

  it("rejects open-redirect attempts", () => {
    expect(safeRedirectPath("https://evil.com")).toBe(DEFAULT_AUTHED_PATH);
    expect(safeRedirectPath("//evil.com")).toBe(DEFAULT_AUTHED_PATH);
    expect(safeRedirectPath("/\\evil.com")).toBe(DEFAULT_AUTHED_PATH);
    expect(safeRedirectPath("javascript:alert(1)")).toBe(DEFAULT_AUTHED_PATH);
  });

  it("honours a custom fallback", () => {
    expect(safeRedirectPath(null, "/")).toBe("/");
  });
});
