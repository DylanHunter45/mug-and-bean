import Script from "next/script";

/**
 * Loads Plausible Analytics - privacy-first, cookie-free, ~1KB so it doesn't
 * threaten the landing page's performance budget.
 *
 * Gated on `NEXT_PUBLIC_ANALYTICS_DOMAIN`: with no domain configured (local
 * dev, previews) nothing is injected and no requests are made. The inline stub
 * installs a `window.plausible` queue so custom events fired before the main
 * script finishes loading are replayed rather than lost.
 */
export function PlausibleScript() {
  const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;
  if (!domain) return null;

  return (
    <>
      <Script
        defer
        data-domain={domain}
        src="https://plausible.io/js/script.js"
        strategy="afterInteractive"
      />
      <Script id="plausible-queue" strategy="afterInteractive">
        {`window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}`}
      </Script>
    </>
  );
}
