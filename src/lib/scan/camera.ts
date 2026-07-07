/**
 * Camera capture helpers - framework-agnostic, so a future React Native shell
 * can reuse the support checks, constraints, and error mapping without touching
 * React. The `<ScanCamera>` component is the web binding over these.
 *
 * The label scanner captures a still frame from a live camera stream (or a
 * user-picked file) and hands a JPEG `File` downstream to `/api/scan`. Nothing
 * here talks to the network - it only produces the image.
 */

/**
 * Why a capture failed, normalised from the grab-bag of `DOMException` names
 * `getUserMedia` throws across browsers. The UI branches on this to show a
 * useful message and steer the user to the file-upload fallback.
 */
export type CameraErrorKind =
  | "denied" // user (or policy) refused camera permission
  | "no-camera" // no camera hardware present
  | "in-use" // camera busy / not readable (held by another app)
  | "insecure" // page isn't a secure context (needs https or localhost)
  | "unsupported" // getUserMedia missing entirely
  | "unknown";

export interface CameraError {
  kind: CameraErrorKind;
  /** User-facing sentence, safe to render directly. */
  message: string;
}

/** Video constraints: prefer the rear camera on mobile, fall back to any. */
export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
  audio: false,
};

/** Default output for a captured frame - JPEG keeps label uploads small. */
export const CAPTURE_MIME = "image/jpeg";
export const CAPTURE_QUALITY = 0.92;

/**
 * True when live camera capture can be attempted. `getUserMedia` only exists in
 * a secure context, so its presence also implies https/localhost - but we guard
 * `navigator` for SSR safety (this module is imported by a client component).
 */
export function isCameraCaptureSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

/**
 * Map a thrown `getUserMedia` error to a `CameraError`. Browsers disagree on the
 * exact name (Chrome/Firefox/Safari), so we match the standardised set and
 * degrade to "unknown" rather than leaking a raw exception string to users.
 */
export function classifyCameraError(error: unknown): CameraError {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name: unknown }).name)
      : "";

  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return {
        kind: "denied",
        message:
          "Camera access was blocked. Allow it in your browser settings, or upload a photo of the label instead.",
      };
    case "NotFoundError":
    case "OverconstrainedError":
      return {
        kind: "no-camera",
        message:
          "No camera was found on this device. Upload a photo of the label instead.",
      };
    case "NotReadableError":
    case "AbortError":
      return {
        kind: "in-use",
        message:
          "The camera is already in use by another app. Close it and try again, or upload a photo instead.",
      };
    default:
      return {
        kind: "unknown",
        message:
          "The camera could not be started. Upload a photo of the label instead.",
      };
  }
}

/** Timestamped name for a captured label image, e.g. `label-1720368000000.jpg`. */
export function scanFileName(mime: string = CAPTURE_MIME): string {
  const ext = mime === "image/png" ? "png" : "jpg";
  return `label-${Date.now()}.${ext}`;
}

/**
 * Draw the video element's current frame onto a canvas and resolve a JPEG blob.
 * Uses `videoWidth`/`videoHeight` (the true stream resolution) so the capture
 * isn't downscaled to the on-screen viewfinder size.
 *
 * Rejects if the stream has no dimensions yet (metadata not loaded) or the
 * browser can't encode - both are surfaced so the caller can fall back.
 */
export function captureFrameToBlob(
  video: HTMLVideoElement,
  opts: { mime?: string; quality?: number } = {},
): Promise<Blob> {
  const { mime = CAPTURE_MIME, quality = CAPTURE_QUALITY } = opts;

  return new Promise((resolve, reject) => {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      reject(new Error("Camera frame is not ready yet."));
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Could not capture the frame."));
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode the captured image."));
      },
      mime,
      quality,
    );
  });
}

/** Wrap a captured blob as a named `File` for downstream upload. */
export function blobToFile(
  blob: Blob,
  name: string = scanFileName(blob.type),
): File {
  return new File([blob], name, {
    type: blob.type || CAPTURE_MIME,
    lastModified: Date.now(),
  });
}

/** Stop every track on a stream - always call before dropping a stream ref. */
export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}
