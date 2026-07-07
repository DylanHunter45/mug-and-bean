/**
 * Desktop -> phone scan handoff: the small, framework-agnostic contract shared
 * by the desktop page (which mints the session and renders the QR) and the
 * public phone capture page (which reads the QR and uploads).
 *
 * The design goal is zero server state: the desktop, already authenticated,
 * mints a one-shot Supabase Storage signed-upload token for a path inside its
 * own user folder and packs everything the phone needs into the QR. The phone
 * is never authenticated - the upload token alone authorizes it to write that
 * one object. The desktop is notified over a Realtime broadcast channel (named
 * by an unguessable session id) and then downloads the image itself.
 *
 * The payload rides in the URL hash fragment (`/scan/handoff#<payload>`), which
 * browsers never send to the server - so the upload token stays out of access
 * logs. It is single-use, short-lived, and scoped to one path; the desktop
 * ignores any path the phone echoes back and only ever reads the path it minted.
 */

/** Private bucket that holds in-flight label captures. See the storage migration. */
export const LABEL_SCANS_BUCKET = "label-scans";

/** Everything the phone needs to upload one frame and ping the desktop. */
export interface HandoffPayload {
  /** Storage bucket id. */
  bucket: string;
  /** Object path, namespaced under the desktop user's id. */
  path: string;
  /** One-shot signed-upload token authorizing a write to `path`. */
  token: string;
  /** Realtime channel the desktop is listening on. */
  channel: string;
}

/** Realtime channel name for a session id. */
export function handoffChannelName(sessionId: string): string {
  return `scan:${sessionId}`;
}

/** Storage object path for a session, kept inside the user's own folder. */
export function scanStoragePath(userId: string, sessionId: string): string {
  return `${userId}/${sessionId}.jpg`;
}

/** Broadcast event fired by the phone once the upload lands. */
export const HANDOFF_EVENT = "captured";

// base64url so the payload survives a URL hash without escaping. `btoa`/`atob`
// operate on Latin-1; the JSON here is ASCII (ids, tokens), so that's safe.
function toBase64Url(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const padded = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=");
  return atob(padded);
}

export function encodeHandoffPayload(payload: HandoffPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

/** Decode a payload from the QR/hash. Returns null on anything malformed. */
export function decodeHandoffPayload(encoded: string): HandoffPayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      hasStringField(parsed, "bucket") &&
      hasStringField(parsed, "path") &&
      hasStringField(parsed, "token") &&
      hasStringField(parsed, "channel")
    ) {
      const p = parsed as Record<string, string>;
      return {
        bucket: p.bucket,
        path: p.path,
        token: p.token,
        channel: p.channel,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function hasStringField(obj: object, key: string): boolean {
  return (
    key in obj && typeof (obj as Record<string, unknown>)[key] === "string"
  );
}

/** Full URL the QR encodes - payload in the hash so servers never see the token. */
export function buildHandoffUrl(
  origin: string,
  payload: HandoffPayload,
): string {
  return `${origin}/scan/handoff#${encodeHandoffPayload(payload)}`;
}
