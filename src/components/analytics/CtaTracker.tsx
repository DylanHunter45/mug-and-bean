"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics/events";

/**
 * Reports a `cta_click` conversion event for any element carrying a
 * `data-cta="<location>"` attribute. Uses a single delegated document listener
 * so the marketing page can stay a server component and simply annotate its
 * CTAs, rather than each one becoming a client island.
 */
export function CtaTracker() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const cta = target?.closest<HTMLElement>("[data-cta]");
      if (!cta) return;
      trackEvent("cta_click", { location: cta.dataset.cta ?? "unknown" });
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
