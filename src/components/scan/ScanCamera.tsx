"use client";

/**
 * ScanCamera - the live label viewfinder and the first step of the scan
 * pipeline (capture -> OCR -> parse -> confirm). It requests the rear camera via
 * WebRTC, previews the stream in a cartographic viewfinder, and on the shutter
 * tap hands a JPEG `File` to `onCapture` for downstream processing. Retake and
 * preview are the parent's job - this component only produces frames.
 *
 * Graceful degradation is first-class, not an afterthought: a file-upload
 * fallback (a plain picker - pick an existing photo from the gallery/files) is
 * always present, so a denied permission or an unsupported browser is never a
 * dead end. All the non-React logic lives in `@/lib/scan/camera` so a native
 * shell can reuse it.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import {
  CAMERA_CONSTRAINTS,
  type CameraError,
  blobToFile,
  captureFrameToBlob,
  classifyCameraError,
  isCameraCaptureSupported,
  stopStream,
} from "@/lib/scan/camera";
import { buttonClasses } from "@/components/ui";

type Phase = "initializing" | "streaming" | "error" | "unsupported";

export interface ScanCameraProps {
  /** Called with the captured (or uploaded) label image, ready to upload. */
  onCapture: (file: File) => void;
  className?: string;
}

export function ScanCamera({ onCapture, className }: ScanCameraProps) {
  const [phase, setPhase] = useState<Phase>("initializing");
  const [error, setError] = useState<CameraError | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Tear down the live stream. Kept in a ref-based callback so both the effect
  // cleanup and the error path release the camera light promptly.
  const stop = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!isCameraCaptureSupported()) {
      setPhase("unsupported");
      return;
    }
    setError(null);
    setPhase("initializing");
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        // Component unmounted mid-request - don't leave the camera on.
        stopStream(stream);
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => {
        // Autoplay can reject (e.g. tab not focused); the stream is still live
        // and the <video> will paint once it can, so this isn't fatal.
      });
      setPhase("streaming");
    } catch (err) {
      stop();
      setError(classifyCameraError(err));
      setPhase("error");
    }
  }, [stop]);

  // Auto-start on mount: reaching this component is the direct result of the
  // user tapping "Scan", so activate the camera immediately.
  useEffect(() => {
    void start();
    return stop;
  }, [start, stop]);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || phase !== "streaming") return;
    try {
      const blob = await captureFrameToBlob(video);
      onCapture(blobToFile(blob));
    } catch {
      setError({
        kind: "unknown",
        message:
          "Could not capture the frame. Try again, or upload a photo of the label instead.",
      });
      setPhase("error");
    }
  }, [onCapture, phase]);

  const handleFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset so re-picking the same file still fires onChange.
      event.target.value = "";
      if (file) onCapture(file);
    },
    [onCapture],
  );

  const showViewfinder = phase === "initializing" || phase === "streaming";

  return (
    <div className={className}>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-card border border-line bg-ink/95 sm:aspect-[4/3]">
        {showViewfinder ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              aria-label="Live camera preview"
              className="h-full w-full object-cover"
            />
            <ViewfinderFrame />
            {phase === "initializing" && (
              <div className="absolute inset-0 flex items-center justify-center bg-ink/70">
                <p className="font-mono text-eyebrow uppercase tracking-wide text-paper/80">
                  Starting camera...
                </p>
              </div>
            )}
          </>
        ) : (
          <FallbackPanel phase={phase} error={error} onRetry={start} />
        )}
      </div>

      {/* Controls: the shutter (live only) plus the always-present upload
          fallback, so denial or an unsupported browser is never a dead end. */}
      <div className="mt-5 flex flex-col items-center gap-4">
        {phase === "streaming" && (
          <button
            type="button"
            onClick={handleCapture}
            aria-label="Capture label"
            className="group flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-cherry bg-cherry/10 transition-transform duration-200 ease-out hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cherry focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:scale-95"
          >
            <span className="h-11 w-11 rounded-full bg-cherry transition-colors duration-200 group-hover:bg-cherry-deep" />
          </button>
        )}

        <label
          className={buttonClasses({
            variant: "secondary",
            size: "md",
            className: "cursor-pointer",
          })}
        >
          {phase === "streaming" ? "Upload a photo instead" : "Upload a photo"}
          {/* No `capture` attribute: the live viewfinder already handles "take a
              photo now", so this is a true file picker - on mobile that lets the
              user choose an existing photo from their gallery/files (with
              `capture` set, mobile forces the camera and blocks the gallery). */}
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
}

/** Cartographic viewfinder overlay: survey corner brackets + a faint reticle. */
function ViewfinderFrame() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-5 sm:inset-7">
        {/* Four L-brackets framing the label, drawn in survey ink. */}
        <span className="absolute left-0 top-0 h-7 w-7 border-l-2 border-t-2 border-paper/70" />
        <span className="absolute right-0 top-0 h-7 w-7 border-r-2 border-t-2 border-paper/70" />
        <span className="absolute bottom-0 left-0 h-7 w-7 border-b-2 border-l-2 border-paper/70" />
        <span className="absolute bottom-0 right-0 h-7 w-7 border-b-2 border-r-2 border-paper/70" />
      </div>
      <p className="absolute bottom-4 left-0 right-0 text-center font-mono text-eyebrow uppercase tracking-wide text-paper/70">
        Frame the label
      </p>
    </div>
  );
}

/** Shown when there's no live stream: unsupported browser or a camera error. */
function FallbackPanel({
  phase,
  error,
  onRetry,
}: {
  phase: Phase;
  error: CameraError | null;
  onRetry: () => void;
}) {
  const message =
    phase === "unsupported"
      ? "This browser can't open the camera directly. Upload a photo of the label instead."
      : (error?.message ??
        "The camera could not be started. Upload a photo of the label instead.");

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <span
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full border border-paper/30 font-mono text-xl text-paper/70"
      >
        !
      </span>
      <p className="max-w-xs text-sm text-paper/85">{message}</p>
      {/* A blocked permission can be re-granted; unsupported can't, so hide retry. */}
      {phase === "error" && (
        <button
          type="button"
          onClick={onRetry}
          className="font-mono text-eyebrow uppercase tracking-wide text-paper/70 underline decoration-paper/40 underline-offset-4 transition-colors hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/60"
        >
          Try camera again
        </button>
      )}
    </div>
  );
}
