/**
 * OCR scan service - the framework-agnostic core behind `POST /api/scan`.
 *
 * Kept free of Next/React/Supabase imports so the same logic could back a future
 * React Native client (PRD portability goal). The route handler is the only
 * adapter: it turns an HTTP request into these plain inputs, and injects the
 * concrete OCR provider + a {@link ScanStore} (Supabase-backed) so this module
 * stays pure and unit-testable with fakes.
 *
 * Responsibilities, in order: validate the upload, enforce the per-user rate
 * limit against the scan ledger, run OCR, and record the attempt. Structured
 * field extraction from the raw text is a separate, later stage - this returns
 * the raw transcription only.
 */
import type { OcrProvider, OcrResult } from "@/lib/ocr/types";

/** Largest image the endpoint accepts (10 MB). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Image MIME types the endpoint accepts. */
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png"] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

/** Billable OCR attempts allowed per user inside the rolling window. */
export const SCAN_RATE_LIMIT = 10;

/** Rolling rate-limit window (1 hour), in milliseconds. */
export const SCAN_RATE_WINDOW_MS = 60 * 60 * 1000;

/** How a scan attempt resolved, as recorded in the ledger. */
export type ScanStatus = "success" | "failure" | "rate_limited";

/** One row to append to the scan ledger. */
export interface ScanLogEntry {
  status: ScanStatus;
  provider?: string;
  textLength?: number;
  latencyMs?: number;
  errorCode?: string;
}

/**
 * Persistence port for the scan ledger. The route supplies a Supabase-backed
 * implementation; tests supply an in-memory fake.
 */
export interface ScanStore {
  /**
   * Count the user's billable OCR attempts (status `success` | `failure`) at or
   * after `since`. `rate_limited` rows are excluded so a locked-out user cannot
   * extend their own lockout, and so the count reflects real engine calls.
   */
  countRecentScans(userId: string, since: Date): Promise<number>;
  /** Append one attempt. Best-effort: implementations must not throw. */
  logScan(userId: string, entry: ScanLogEntry): Promise<void>;
}

/** Reasons an upload is rejected before any OCR call. */
export type ImageValidationError =
  | "missing_image"
  | "unsupported_type"
  | "image_too_large";

/** Just the upload metadata validation needs - not the bytes. */
export interface ImageMeta {
  mimeType: string;
  size: number;
}

/** Validate the upload; returns the rejection reason, or null when acceptable. */
export function validateScanImage(
  image: ImageMeta | null,
): ImageValidationError | null {
  if (!image || image.size === 0) return "missing_image";
  if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(image.mimeType as AllowedImageMimeType)
  ) {
    return "unsupported_type";
  }
  if (image.size > MAX_IMAGE_BYTES) return "image_too_large";
  return null;
}

/** Outcome of a scan attempt that passed validation. */
export type ScanOutcome =
  | { ok: true; text: string; confidence?: number; latencyMs: number }
  | { ok: false; error: "rate_limited"; retryAfterSeconds: number }
  | { ok: false; error: "ocr_failed" };

export interface RunScanParams {
  userId: string;
  image: Buffer | Uint8Array;
  mimeType?: string;
  provider: OcrProvider;
  store: ScanStore;
  /** Injectable clock for deterministic tests; defaults to now. */
  now?: Date;
}

/**
 * Rate-limit, run OCR, and log the attempt. Assumes the image has already been
 * validated by {@link validateScanImage}. Never throws for an OCR failure - it
 * is logged and surfaced as a structured outcome so the caller can respond with
 * the human-in-the-loop fallback rather than a 500.
 */
export async function runScan(params: RunScanParams): Promise<ScanOutcome> {
  const { userId, image, mimeType, provider, store } = params;
  const now = params.now ?? new Date();
  const windowStart = new Date(now.getTime() - SCAN_RATE_WINDOW_MS);

  const recent = await store.countRecentScans(userId, windowStart);
  if (recent >= SCAN_RATE_LIMIT) {
    await store.logScan(userId, { status: "rate_limited" });
    return {
      ok: false,
      error: "rate_limited",
      // Conservative: the window is rolling, so tell the client to wait out a
      // full window rather than track each row's exact expiry.
      retryAfterSeconds: Math.ceil(SCAN_RATE_WINDOW_MS / 1000),
    };
  }

  let result: OcrResult;
  try {
    result = await provider.recognize(image, mimeType);
  } catch {
    await store.logScan(userId, {
      status: "failure",
      provider: provider.id,
      errorCode: "ocr_error",
    });
    return { ok: false, error: "ocr_failed" };
  }

  await store.logScan(userId, {
    status: "success",
    provider: provider.id,
    textLength: result.rawText.length,
    latencyMs: result.latencyMs,
  });

  return {
    ok: true,
    text: result.rawText,
    confidence: result.documentConfidence,
    latencyMs: result.latencyMs,
  };
}
