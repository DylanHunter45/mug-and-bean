import { afterEach, describe, expect, it, vi } from "vitest";

import { trackEvent } from "./events";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("trackEvent", () => {
  it("forwards the event name and wrapped props to window.plausible", () => {
    const plausible = vi.fn();
    vi.stubGlobal("window", { plausible });

    trackEvent("cta_click", { location: "hero" });

    expect(plausible).toHaveBeenCalledWith("cta_click", {
      props: { location: "hero" },
    });
  });

  it("omits the options object when no props are given", () => {
    const plausible = vi.fn();
    vi.stubGlobal("window", { plausible });

    trackEvent("waitlist_submit");

    expect(plausible).toHaveBeenCalledWith("waitlist_submit", undefined);
  });

  it("is a safe no-op when no provider is loaded", () => {
    vi.stubGlobal("window", {});
    expect(() => trackEvent("waitlist_submit")).not.toThrow();
  });

  it("does not throw when window is undefined (SSR)", () => {
    // jsdom-free node env: window is already absent, but be explicit.
    vi.stubGlobal("window", undefined);
    expect(() => trackEvent("cta_click")).not.toThrow();
  });
});
