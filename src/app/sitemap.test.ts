import { afterEach, beforeEach, describe, expect, it } from "vitest";

import sitemap from "./sitemap";

const ORIGINAL = process.env.NEXT_PUBLIC_SITE_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";
});

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL;
});

describe("sitemap", () => {
  it("lists the landing page against the configured site URL", () => {
    const entries = sitemap();
    expect(entries).toHaveLength(1);
    expect(entries[0].url).toBe("https://example.test/");
    expect(entries[0].priority).toBe(1);
  });

  it("emits absolute URLs so crawlers resolve them unambiguously", () => {
    for (const entry of sitemap()) {
      expect(entry.url).toMatch(/^https?:\/\//);
    }
  });
});
