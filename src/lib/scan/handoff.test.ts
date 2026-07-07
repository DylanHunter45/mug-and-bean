import { describe, expect, it } from "vitest";

import {
  type HandoffPayload,
  buildHandoffUrl,
  decodeHandoffPayload,
  encodeHandoffPayload,
  handoffChannelName,
  scanStoragePath,
} from "./handoff";

const sample: HandoffPayload = {
  bucket: "label-scans",
  path: "user-123/session-abc.jpg",
  token: "signed-upload-token-xyz",
  channel: "scan:session-abc",
};

describe("encode/decode round trip", () => {
  it("recovers the exact payload", () => {
    const encoded = encodeHandoffPayload(sample);
    expect(decodeHandoffPayload(encoded)).toEqual(sample);
  });

  it("produces a URL-safe string (no +, /, or = padding)", () => {
    const encoded = encodeHandoffPayload(sample);
    expect(encoded).not.toMatch(/[+/=]/);
  });
});

describe("decodeHandoffPayload", () => {
  it("returns null for garbage input", () => {
    expect(decodeHandoffPayload("not-base64!!")).toBeNull();
    expect(decodeHandoffPayload("")).toBeNull();
  });

  it("returns null when a required field is missing", () => {
    const encoded = encodeHandoffPayload(sample);
    // Drop a field, re-encode by hand to simulate a tampered payload.
    const partial = btoa(JSON.stringify({ bucket: "b", path: "p", token: "t" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(decodeHandoffPayload(partial)).toBeNull();
    // Sanity: the full one still decodes.
    expect(decodeHandoffPayload(encoded)).not.toBeNull();
  });

  it("returns null when a field is the wrong type", () => {
    const bad = btoa(
      JSON.stringify({ bucket: "b", path: "p", token: "t", channel: 42 }),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(decodeHandoffPayload(bad)).toBeNull();
  });
});

describe("helpers", () => {
  it("names the channel from the session id", () => {
    expect(handoffChannelName("abc")).toBe("scan:abc");
  });

  it("namespaces the storage path under the user id", () => {
    expect(scanStoragePath("user-1", "sess-9")).toBe("user-1/sess-9.jpg");
  });

  it("puts the payload in the URL hash, not the query", () => {
    const url = buildHandoffUrl("https://mug-and-bean.app", sample);
    expect(url.startsWith("https://mug-and-bean.app/scan/handoff#")).toBe(true);
    expect(url).not.toContain("?");
    const encoded = url.split("#")[1];
    expect(decodeHandoffPayload(encoded)).toEqual(sample);
  });
});
