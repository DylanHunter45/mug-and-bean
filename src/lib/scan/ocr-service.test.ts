import { describe, expect, it, vi } from "vitest";

import type { OcrProvider } from "@/lib/ocr/types";
import {
  MAX_IMAGE_BYTES,
  SCAN_RATE_LIMIT,
  runScan,
  validateScanImage,
  type ScanLogEntry,
  type ScanStore,
} from "./ocr-service";

/** In-memory ScanStore that records every logged attempt. */
function fakeStore(
  recentCount: number,
): ScanStore & { logged: ScanLogEntry[] } {
  const logged: ScanLogEntry[] = [];
  return {
    logged,
    countRecentScans: vi.fn(async () => recentCount),
    logScan: vi.fn(async (_userId: string, entry: ScanLogEntry) => {
      logged.push(entry);
    }),
  };
}

/** OcrProvider stub that returns a fixed transcription. */
function fakeProvider(text: string): OcrProvider {
  return {
    id: "fake",
    displayName: "Fake OCR",
    recognize: vi.fn(async () => ({
      rawText: text,
      documentConfidence: 0.97,
      latencyMs: 42,
    })),
  };
}

const image = Buffer.from("not-a-real-jpeg");

describe("validateScanImage", () => {
  it("rejects a missing or empty upload", () => {
    expect(validateScanImage(null)).toBe("missing_image");
    expect(validateScanImage({ mimeType: "image/jpeg", size: 0 })).toBe(
      "missing_image",
    );
  });

  it("rejects an unsupported content type", () => {
    expect(validateScanImage({ mimeType: "image/gif", size: 1000 })).toBe(
      "unsupported_type",
    );
    expect(validateScanImage({ mimeType: "application/pdf", size: 1000 })).toBe(
      "unsupported_type",
    );
  });

  it("rejects an image over the size ceiling", () => {
    expect(
      validateScanImage({ mimeType: "image/png", size: MAX_IMAGE_BYTES + 1 }),
    ).toBe("image_too_large");
  });

  it("accepts JPEG and PNG within the ceiling", () => {
    expect(
      validateScanImage({ mimeType: "image/jpeg", size: 1000 }),
    ).toBeNull();
    expect(
      validateScanImage({ mimeType: "image/png", size: MAX_IMAGE_BYTES }),
    ).toBeNull();
  });
});

describe("runScan", () => {
  it("returns the raw OCR text and logs a success", async () => {
    const store = fakeStore(0);
    const provider = fakeProvider("BEANS\nRwanda\nWashed");

    const outcome = await runScan({
      userId: "user-1",
      image,
      mimeType: "image/jpeg",
      provider,
      store,
    });

    expect(outcome).toEqual({
      ok: true,
      text: "BEANS\nRwanda\nWashed",
      confidence: 0.97,
      latencyMs: 42,
    });
    expect(store.logged).toEqual([
      {
        status: "success",
        provider: "fake",
        textLength: "BEANS\nRwanda\nWashed".length,
        latencyMs: 42,
      },
    ]);
  });

  it("blocks and logs when the user is at the rate limit, without calling OCR", async () => {
    const store = fakeStore(SCAN_RATE_LIMIT);
    const provider = fakeProvider("should not run");

    const outcome = await runScan({
      userId: "user-1",
      image,
      provider,
      store,
    });

    expect(outcome).toEqual({
      ok: false,
      error: "rate_limited",
      retryAfterSeconds: 3600,
    });
    expect(provider.recognize).not.toHaveBeenCalled();
    expect(store.logged).toEqual([{ status: "rate_limited" }]);
  });

  it("allows the attempt at exactly one below the limit", async () => {
    const store = fakeStore(SCAN_RATE_LIMIT - 1);
    const outcome = await runScan({
      userId: "user-1",
      image,
      provider: fakeProvider("ok"),
      store,
    });
    expect(outcome.ok).toBe(true);
  });

  it("logs a failure and returns ocr_failed when the engine throws", async () => {
    const store = fakeStore(0);
    const provider: OcrProvider = {
      id: "fake",
      displayName: "Fake OCR",
      recognize: vi.fn(async () => {
        throw new Error("vision exploded");
      }),
    };

    const outcome = await runScan({
      userId: "user-1",
      image,
      provider,
      store,
    });

    expect(outcome).toEqual({ ok: false, error: "ocr_failed" });
    expect(store.logged).toEqual([
      { status: "failure", provider: "fake", errorCode: "ocr_error" },
    ]);
  });

  it("counts recent scans from one window before the injected clock", async () => {
    const store = fakeStore(0);
    const now = new Date("2026-07-07T12:00:00.000Z");

    await runScan({
      userId: "user-1",
      image,
      provider: fakeProvider("ok"),
      store,
      now,
    });

    expect(store.countRecentScans).toHaveBeenCalledWith(
      "user-1",
      new Date("2026-07-07T11:00:00.000Z"),
    );
  });
});
