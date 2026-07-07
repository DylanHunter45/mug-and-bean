/**
 * Canonical public base URL of the current deployment.
 *
 * Read from `NEXT_PUBLIC_SITE_URL` (set per environment - see `.env.example`),
 * falling back to the production origin. Used to build absolute URLs for SEO
 * metadata, Open Graph tags, `robots.txt`, and `sitemap.xml`. Always returned
 * without a trailing slash so callers can append paths safely.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://mug-and-bean.vercel.app";
  return raw.replace(/\/+$/, "");
}
