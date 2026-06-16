/**
 * Google Cloud Vision adapter — DOCUMENT_TEXT_DETECTION via the REST API.
 *
 * Uses the plain REST `images:annotate` endpoint with an API key, which keeps
 * the benchmark dependency-free (just `fetch`) and matches the credential the
 * .env.example documents first (GOOGLE_CLOUD_VISION_API_KEY). For a future
 * service-account / ADC flow, swap in the `@google-cloud/vision` client here —
 * the {@link OcrProvider} contract stays the same.
 *
 * Docs: https://cloud.google.com/vision/docs/fulltext-annotations
 */
import type { OcrProvider, OcrResult } from "../types";

const ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";

/** True when an API key is configured for Google Cloud Vision. */
export function hasGoogleCredentials(): boolean {
  return Boolean(process.env.GOOGLE_CLOUD_VISION_API_KEY);
}

function toBase64(image: Buffer | Uint8Array): string {
  return Buffer.from(image).toString("base64");
}

interface VisionResponse {
  responses?: Array<{
    fullTextAnnotation?: {
      text?: string;
      pages?: Array<{ confidence?: number }>;
    };
    error?: { message?: string };
  }>;
}

function meanPageConfidence(
  pages: Array<{ confidence?: number }> | undefined,
): number | undefined {
  const values = (pages ?? [])
    .map((p) => p.confidence)
    .filter((c): c is number => typeof c === "number");
  if (values.length === 0) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export const googleVisionProvider: OcrProvider = {
  id: "google-vision",
  displayName: "Google Cloud Vision (Document Text Detection)",

  async recognize(image): Promise<OcrResult> {
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GOOGLE_CLOUD_VISION_API_KEY is not set — cannot call Google Cloud Vision.",
      );
    }

    const body = {
      requests: [
        {
          image: { content: toBase64(image) },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        },
      ],
    };

    const start = Date.now();
    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      throw new Error(
        `Google Cloud Vision HTTP ${res.status}: ${await res.text()}`,
      );
    }

    const json = (await res.json()) as VisionResponse;
    const first = json.responses?.[0];
    if (first?.error?.message) {
      throw new Error(`Google Cloud Vision error: ${first.error.message}`);
    }

    return {
      rawText: first?.fullTextAnnotation?.text ?? "",
      documentConfidence: meanPageConfidence(first?.fullTextAnnotation?.pages),
      latencyMs,
    };
  },
};
