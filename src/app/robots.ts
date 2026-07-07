import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site";

/**
 * Generates `/robots.txt`. Crawlers are welcome on the public marketing page
 * but kept out of the authenticated app, auth flow, API, and internal routes
 * (the component gallery is a dev surface, not a landing page).
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/api/", "/auth/", "/login", "/signup", "/styleguide"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
