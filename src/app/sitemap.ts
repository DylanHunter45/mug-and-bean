import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site";

/**
 * Generates `/sitemap.xml`. Only the public, indexable landing page belongs
 * here — the app, auth, and internal routes are intentionally excluded (they're
 * disallowed in `robots.ts`). Add public routes here as they ship.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
