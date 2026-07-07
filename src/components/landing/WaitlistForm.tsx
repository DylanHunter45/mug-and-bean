"use client";

/**
 * WaitlistForm — the landing page's frictionless email capture.
 *
 * Owns the visual form, client-side email validation, and the success/incentive
 * states; it's the scroll target the Hero CTAs jump to.
 *
 * Persistence is intentionally a seam: `submitEmail()` below is a placeholder
 * to be pointed at the backend (a server action / route handler that writes the
 * address, re-validates server-side, and treats duplicates as success). The
 * surrounding UI already models the success and error states.
 */
import { useRef, useState } from "react";

import { buttonClasses, inputClasses } from "@/components/ui";

// Same shape the server will validate against — keep the two in sync.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "submitting" | "success" | "error";

async function submitEmail(email: string): Promise<void> {
  // Persistence seam: point `email` at the backend here (server action / route
  // handler), returning success for both new and already-subscribed addresses.
  // For now, simulate a fast round-trip so the success state is exercised.
  await new Promise((resolve) => setTimeout(resolve, 400));
  void email;
}

export function WaitlistForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = inputRef.current?.value.trim() ?? "";

    // Client-side gate (the server re-validates on submit).
    if (!EMAIL_RE.test(email)) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }

    setInvalid(false);
    setStatus("submitting");
    try {
      await submitEmail(email);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
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
          You&apos;re on the list.
        </p>
        <p className="max-w-sm text-sm text-ink-soft">
          We&apos;ll email you the moment Mug &amp; Bean opens — your founding
          spot in the cellar is reserved.
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
