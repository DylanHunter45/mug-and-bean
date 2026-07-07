import { afterEach, beforeEach, describe, expect, it } from "vitest";

import robots from "./robots";

const ORIGINAL = process.env.NEXT_PUBLIC_SITE_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";
});

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL;
});

describe("robots", () => {
  it("allows the public root and points at the sitemap", () => {
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rule.allow).toBe("/");
    expect(result.sitemap).toBe("https://example.test/sitemap.xml");
  });

  it("keeps crawlers out of the app, auth, and API surfaces", () => {
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = ([] as string[]).concat(rule.disallow ?? []);

    for (const path of ["/app", "/api/", "/auth/", "/login", "/signup"]) {
      expect(disallow).toContain(path);
    }
  });
});
