"use client";

/**
 * WaitlistForm — the landing page's frictionless email capture.
 *
 * Owns the visual form, client-side email validation, and the success/incentive
 * states; it's the scroll target the Hero CTAs jump to. On submit it posts to
 * `POST /api/waitlist`, which persists the address, re-validates server-side,
 * and reports whether this was a new sign-up or an already-subscribed address —
 * both are treated as success (a duplicate is never shown as an error).
 */
import { useEffect, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics/events";
import { buttonClasses, inputClasses } from "@/components/ui";
import { isValidEmail } from "@/lib/waitlist/validate";

type Status = "idle" | "submitting" | "success" | "error";
// Distinguishes the two success copies; mirrors the endpoint's response.
type Outcome = "subscribed" | "already_subscribed";

interface WaitlistResponse {
  status?: Outcome;
}

/** Read an optional `?ref=` attribution tag from the URL, if present. */
function readReferralSource(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("ref");
}

export function WaitlistForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [outcome, setOutcome] = useState<Outcome>("subscribed");
  const [invalid, setInvalid] = useState(false);
  const referralRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Capture attribution once on mount (window isn't available during SSR).
  useEffect(() => {
    referralRef.current = readReferralSource();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = inputRef.current?.value.trim() ?? "";

    // Client-side gate (the endpoint re-validates as the authoritative check).
    if (!isValidEmail(email)) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }

    setInvalid(false);
    setStatus("submitting");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          referralSource: referralRef.current,
        }),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const data = (await response.json()) as WaitlistResponse;
      const alreadyOnList = data.status === "already_subscribed";
      setOutcome(alreadyOnList ? "already_subscribed" : "subscribed");
      setStatus("success");
      // Report the conversion — distinguishing a fresh sign-up from a repeat so
      // the true new-signup count (the founding-tasters KPI) stays clean.
      trackEvent(
        alreadyOnList ? "waitlist_already_subscribed" : "waitlist_submit",
      );
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    const alreadyOnList = outcome === "already_subscribed";
    return (
      <div
        className="reveal flex flex-col items-center gap-3 text-center"
        role="status"
        aria-live="polite"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-survey bg-surface font-mono text-lg text-survey">
          ✓
        </span>
        <p className="font-display text-xl font-semibold text-ink">
          {alreadyOnList
            ? "You're already on the list."
            : "You're on the list."}
        </p>
        <p className="max-w-sm text-sm text-ink-soft">
          {alreadyOnList
            ? "Your founding spot in the cellar is still reserved — we'll email you the moment Mug & Bean opens."
            : "We'll email you the moment Mug & Bean opens — your founding spot in the cellar is reserved."}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex w-full max-w-md flex-col gap-2"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          ref={inputRef}
          id="waitlist-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          disabled={status === "submitting"}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "waitlist-email-error" : undefined}
          onInput={() => invalid && setInvalid(false)}
          className={inputClasses({
            invalid,
            className: "flex-1 px-4 py-3 text-base",
          })}
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className={buttonClasses({ size: "lg", className: "shrink-0" })}
        >
          {status === "submitting" ? "Joining…" : "Join the waitlist"}
        </button>
      </div>

      {/* One live region for both validation and submit errors. */}
      <p
        id="waitlist-email-error"
        role="alert"
        aria-live="assertive"
        className="min-h-[1.25rem] text-sm text-red-600"
      >
        {invalid && "Enter a valid email address."}
        {status === "error" &&
          "Something went wrong — please try again in a moment."}
      </p>
    </form>
  );
}
