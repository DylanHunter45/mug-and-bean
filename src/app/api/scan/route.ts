/**
 * Label OCR endpoint - POST /api/scan
 *
 * Accepts a multipart image upload (`image` field, JPEG/PNG up to 10MB) from a
 * signed-in user, runs it through the configured OCR engine (Google Cloud
 * Vision), and returns the raw extracted text. Structured field parsing is a
 * later stage - this returns the transcription only.
 *
 * The raw text is then run through the label parser, which returns the
 * structured, per-field result (with confidence bands) the confirmation UI
 * edits - so the client gets both the transcription and a first parse in one
 * round-trip. The parser fuzzy-matches the roaster against the catalog, so the
 * known roasters are loaded and passed in.
 *
 * Every attempt is written to the `scan_logs` ledger (for accuracy monitoring),
 * and that same ledger backs a per-user rate limit (10 billable scans / hour)
 * so OCR spend can't run away. Ledger reads/writes go through the service-role
 * admin client because `scan_logs` is deliberately unreachable by the public
 * Data API roles - a user must not be able to edit their own rate-limit ledger.
 *
 * Runs on the Node runtime (default): the Vision adapter uses Node `Buffer`.
 */
import { NextResponse } from "next/server";

import { apiError, authGate } from "@/lib/api/response";
import {
  googleVisionProvider,
  hasGoogleCredentials,
} from "@/lib/ocr/providers";
import { parseLabel, type KnownRoaster } from "@/lib/scan/label-parser";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  runScan,
  validateScanImage,
  type ImageValidationError,
  type ScanLogEntry,
  type ScanStore,
} from "@/lib/scan/ocr-service";
import type { createClient } from "@/lib/supabase/server";

/** Map an upload-rejection reason to its HTTP status + message. */
const IMAGE_ERRORS: Record<
  ImageValidationError,
  { status: number; message: string }
> = {
  missing_image: {
    status: 400,
    message: "Attach a coffee-label image to scan.",
  },
  unsupported_type: {
    status: 415,
    message: "Use a JPEG or PNG image.",
  },
  image_too_large: { status: 413, message: "Image must be 10MB or smaller." },
};

export async function POST(request: Request) {
  const { userId, supabase } = await authGate();
  if (!userId) return apiError("unauthorized", 401);

  // Fail clearly if the engine isn't configured, rather than burning a
  // rate-limit slot on a call that would throw.
  if (!hasGoogleCredentials()) {
    return apiError("ocr_unavailable", 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError("invalid_request", 400);
  }

  const file = form.get("image");
  const image = file instanceof File ? file : null;

  const invalid = validateScanImage(
    image ? { mimeType: image.type, size: image.size } : null,
  );
  if (invalid) {
    const { status, message } = IMAGE_ERRORS[invalid];
    return NextResponse.json({ error: invalid, message }, { status });
  }

  const bytes = Buffer.from(await image!.arrayBuffer());
  const store = createScanStore();

  const outcome = await runScan({
    userId,
    image: bytes,
    mimeType: image!.type,
    provider: googleVisionProvider,
    store,
  });

  if (!outcome.ok) {
    if (outcome.error === "rate_limited") {
      return NextResponse.json(
        {
          error: "rate_limited",
          message:
            "You've hit the scan limit for now. Try again in about an hour, or add the coffee by hand.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(outcome.retryAfterSeconds) },
        },
      );
    }
    // OCR failed. The scan flow's fallback is manual/confirm entry, so this is a
    // recoverable 502, not a hard 500.
    return apiError("ocr_failed", 502);
  }

  const parsed = parseLabel(outcome.text, {
    knownRoasters: await loadKnownRoasters(supabase),
  });

  return NextResponse.json({
    text: outcome.text,
    confidence: outcome.confidence,
    latencyMs: outcome.latencyMs,
    parsed,
  });
}

/**
 * Load the catalog's roasters (id + name) so the parser can fuzzy-match the
 * scanned roaster to a known entity. The whole list is fetched deliberately:
 * the match considers every label line, not just the parser's first guess, so
 * it can recover a roaster the raw heuristic put on the wrong line - which is
 * where most of the roaster-accuracy lift comes from. At the current catalog
 * size this is a cheap read; if the roaster table grows large, narrow this with
 * a `search_roasters` (pg_trgm) pre-filter on the OCR text. A read failure is
 * non-fatal: the parser still returns the raw extraction, just unmatched.
 */
async function loadKnownRoasters(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<KnownRoaster[]> {
  const { data, error } = await supabase.from("roasters").select("id, name");
  if (error) {
    console.error("roaster catalog load failed:", error);
    return [];
  }
  return (data ?? []) as KnownRoaster[];
}

/**
 * Supabase-backed scan ledger, keyed off the service-role client. Kept here (not
 * in the pure service module) so `ocr-service.ts` stays free of server-only
 * imports and unit-testable with a fake store.
 */
function createScanStore(): ScanStore {
  const admin = createAdminClient();
  return {
    async countRecentScans(userId, since) {
      const { count, error } = await admin
        .from("scan_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("status", ["success", "failure"])
        .gte("created_at", since.toISOString());
      if (error) {
        // Fail closed would block every scan on a transient DB hiccup; fail open
        // (treat as no recent scans) keeps the feature working and is logged.
        console.error("scan_logs count failed:", error);
        return 0;
      }
      return count ?? 0;
    },
    async logScan(userId, entry: ScanLogEntry) {
      const { error } = await admin.from("scan_logs").insert({
        user_id: userId,
        status: entry.status,
        provider: entry.provider ?? null,
        text_length: entry.textLength ?? null,
        latency_ms: entry.latencyMs ?? null,
        error_code: entry.errorCode ?? null,
      });
      if (error) console.error("scan_logs insert failed:", error);
    },
  };
}
