/**
 * Analytics event tracking — framework-agnostic, provider-thin.
 *
 * Page views are counted automatically by the Plausible script (loaded, when
 * configured, by `PlausibleScript`). This module covers the *custom* conversion
 * events the marketing surface cares about. It's deliberately not coupled to
 * React so any surface (or a future native shell) can report the same events.
 *
 * When no analytics provider is loaded (`window.plausible` undefined — e.g.
 * local dev, or before the deferred script arrives) every call is a safe no-op.
 */

/** The conversion events tracked on the landing page. */
export type AnalyticsEvent =
  | "cta_click"
  | "waitlist_submit"
  | "waitlist_already_subscribed";

/** Property values Plausible accepts on a custom event. */
type EventProps = Record<string, string | number | boolean>;

type PlausibleFn = (event: string, options?: { props?: EventProps }) => void;

declare global {
  interface Window {
    // The queue stub (`.q`) is installed before the script loads so early
    // events aren't dropped; the real function replaces it once loaded.
    plausible?: PlausibleFn & { q?: unknown[] };
  }
}

/**
 * Report a custom analytics event. No-ops during SSR and when no provider is
 * present, so callers never need to guard.
 */
export function trackEvent(event: AnalyticsEvent, props?: EventProps): void {
  if (typeof window === "undefined") return;
  window.plausible?.(event, props ? { props } : undefined);
}
