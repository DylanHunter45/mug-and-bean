import { describe, expect, it } from "vitest";

import { friendlyAuthMessage } from "./errors";

describe("friendlyAuthMessage", () => {
  it("rewrites the email send rate-limit by code", () => {
    expect(
      friendlyAuthMessage(
        "email rate limit exceeded",
        "over_email_send_rate_limit",
      ),
    ).toMatch(/too many emails/i);
  });

  it("rewrites the rate-limit by message when no code is present", () => {
    expect(friendlyAuthMessage("Email rate limit exceeded")).toMatch(
      /too many emails/i,
    );
  });

  it("rewrites invalid sign-in credentials", () => {
    expect(
      friendlyAuthMessage("Invalid login credentials", "invalid_credentials"),
    ).toMatch(/doesn't match/i);
  });

  it("rewrites an unconfirmed email", () => {
    expect(
      friendlyAuthMessage("Email not confirmed", "email_not_confirmed"),
    ).toMatch(/confirm your email/i);
  });

  it("rewrites an invalid email address", () => {
    expect(
      friendlyAuthMessage(
        "Unable to validate email address: invalid format",
        "email_address_invalid",
      ),
    ).toMatch(/looks invalid/i);
  });

  it("passes unrecognised messages through unchanged", () => {
    expect(friendlyAuthMessage("Some novel server error")).toBe(
      "Some novel server error",
    );
  });
});
