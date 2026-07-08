/**
 * Browser-side client for the OCR scan endpoint (POST /api/scan).
 *
 * A thin fetch wrapper that uploads a captured label image and normalises the
 * endpoint's responses into a small tagged result the UI can switch on - so the
 * scan screen never has to know status codes or error envelopes. The request
 * rides the user's session cookie automatically (same-origin fetch).
 */

/** Raw OCR result plus the endpoint's quality/latency signals. */
export interface ScanSuccess {
  ok: true;
  text: string;
  confidence?: number;
  latencyMs: number;
}

/** A failure the UI can explain, with a message safe to show the user. */
export interface ScanFailure {
  ok: false;
  /** Machine tag for branching (e.g. auto-focus manual entry on `ocr_failed`). */
  reason:
    | "unauthorized"
    | "rate_limited"
    | "ocr_failed"
    | "ocr_unavailable"
    | "invalid_image"
    | "network"
    | "unknown";
  message: string;
}

export type ScanClientResult = ScanSuccess | ScanFailure;

const MESSAGES: Record<ScanFailure["reason"], string> = {
  unauthorized: "Please sign in again to scan a label.",
  rate_limited:
    "You've hit the scan limit for now. Try again in about an hour, or add the coffee by hand.",
  ocr_failed:
    "We couldn't read that label. Try a sharper, well-lit shot - or enter the details by hand.",
  ocr_unavailable:
    "Label scanning is temporarily unavailable. Try again shortly.",
  invalid_image: "That image can't be scanned. Use a JPEG or PNG under 10MB.",
  network: "Network error - check your connection and try again.",
  unknown: "Something went wrong reading the label. Please try again.",
};

/** Upload a captured image to /api/scan and return a normalised result. */
export async function scanLabel(image: File): Promise<ScanClientResult> {
  const body = new FormData();
  body.append("image", image);

  let res: Response;
  try {
    res = await fetch("/api/scan", { method: "POST", body });
  } catch {
    return { ok: false, reason: "network", message: MESSAGES.network };
  }

  if (res.ok) {
    const data = (await res.json()) as {
      text: string;
      confidence?: number;
      latencyMs: number;
    };
    return { ok: true, ...data };
  }

  const reason = reasonForStatus(res.status);
  // Prefer the server's own message when it sends one (e.g. the rate-limit copy).
  let message = MESSAGES[reason];
  try {
    const data = (await res.json()) as { message?: string };
    if (data?.message) message = data.message;
  } catch {
    // No/!JSON body - fall back to the mapped message.
  }
  return { ok: false, reason, message };
}

function reasonForStatus(status: number): ScanFailure["reason"] {
  switch (status) {
    case 401:
      return "unauthorized";
    case 429:
      return "rate_limited";
    case 413:
    case 415:
    case 400:
      return "invalid_image";
    case 503:
      return "ocr_unavailable";
    case 502:
      return "ocr_failed";
    default:
      return "unknown";
  }
}
