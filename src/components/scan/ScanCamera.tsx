"use client";

/**
 * ScanCamera - captures a coffee-bag label as a JPEG `File` and hands it to
 * `onCapture`; the first step of the scan pipeline (capture -> OCR -> parse ->
 * confirm). Retake and preview are the parent's job - this only produces frames.
 *
 * Capture strategy is device-aware, because a phone label shot has to be sharp
 * enough for OCR:
 *
 * - On touch devices we use the OS camera via `<input capture="environment">`.
 *   A live `getUserMedia` preview on a phone focuses poorly up close (fixed lens,
 *   ~10cm minimum focus, no macro switch, capped stream resolution), so it comes
 *   out blurry; the native camera shoots full-resolution with real autofocus.
 * - On desktop (no touch) there's no native camera app, so we run the live
 *   WebRTC viewfinder with a shutter button. On the desktop scan flow this is a
 *   fallback anyway - the phone handoff is the primary path.
 *
 * A plain "upload a photo" picker (no `capture`, so mobile can reach the gallery)
 * is always present, so a denied permission or unsupported browser is never a
 * dead end. All non-React logic lives in `@/lib/scan/camera` for native reuse.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import {
  CAMERA_CONSTRAINTS,
  type CameraError,
  blobToFile,
  captureFrameToBlob,
  classifyCameraError,
  focusAtPoint,
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
  // null until measured, so we don't flash the desktop viewfinder on a phone.
  const [isTouch, setIsTouch] = useState<boolean | null>(null);

  useEffect(() => {
    setIsTouch(
      typeof window !== "undefined" &&
        window.matchMedia?.("(pointer: coarse)").matches === true,
    );
  }, []);

  const handleFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset so re-picking the same file still fires onChange.
      event.target.value = "";
      if (file) onCapture(file);
    },
    [onCapture],
  );

  if (isTouch === null) {
    return (
      <div className={className}>
        <div className="h-72 animate-pulse rounded-card bg-surface-2" />
      </div>
    );
  }

  return (
    <div className={className}>
      {isTouch ? (
        <NativeCapture onFile={handleFile} />
      ) : (
        <LiveViewfinder onCapture={onCapture} onFile={handleFile} />
      )}
    </div>
  );
}

/**
 * Touch path: the native OS camera for a sharp shot, plus a gallery picker.
 * Two separate inputs - `capture` forces the camera (great for a fresh photo)
 * but blocks the gallery, so the "upload" input deliberately omits it.
 */
function NativeCapture({
  onFile,
}: {
  onFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-card border border-line bg-surface px-6 py-10 text-center">
      <ViewfinderGlyph />
      <div className="flex flex-col gap-1">
        <p className="font-display text-lg font-semibold text-ink">
          Photograph the label
        </p>
        <p className="max-w-xs text-sm text-ink-soft">
          Use your camera for a sharp, full-resolution shot - much clearer than
          an in-browser preview. Fill the frame with the label.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <label
          className={buttonClasses({
            size: "lg",
            className: "cursor-pointer",
          })}
        >
          Take a photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFile}
            className="sr-only"
          />
        </label>
        <label
          className={buttonClasses({
            variant: "secondary",
            size: "md",
            className: "cursor-pointer",
          })}
        >
          Upload from library
          {/* No `capture`, so mobile opens the gallery/files instead of forcing
              the camera. */}
          <input
            type="file"
            accept="image/*"
            onChange={onFile}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
}

/**
 * Desktop path: a live WebRTC viewfinder with a shutter. Kept off phones, where
 * the native camera gives a far sharper capture (see the module docstring).
 */
function LiveViewfinder({
  onCapture,
  onFile,
}: {
  onCapture: (file: File) => void;
  onFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [phase, setPhase] = useState<Phase>("initializing");
  const [error, setError] = useState<CameraError | null>(null);
  // A transient reticle at the last tapped point, cleared after it pulses.
  const [focusRing, setFocusRing] = useState<{
    x: number;
    y: number;
    id: number;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

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

  // Tap the viewfinder to refocus at that spot (where the platform allows it),
  // and drop a reticle so the tap feels acknowledged even when it doesn't.
  const handleFocusTap = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (phase !== "streaming") return;
      const rect = event.currentTarget.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const id = Date.now();
      setFocusRing({ x: px, y: py, id });
      clearTimeout(focusTimer.current);
      focusTimer.current = setTimeout(() => {
        setFocusRing((cur) => (cur?.id === id ? null : cur));
      }, 700);
      void focusAtPoint(streamRef.current, px / rect.width, py / rect.height);
    },
    [phase],
  );

  // Clear any pending reticle timer on unmount.
  useEffect(() => () => clearTimeout(focusTimer.current), []);

  const showViewfinder = phase === "initializing" || phase === "streaming";

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card border border-line bg-ink/95">
        {showViewfinder ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              aria-label="Live camera preview - tap to focus"
              onClick={handleFocusTap}
              className="h-full w-full cursor-crosshair object-cover"
            />
            <ViewfinderFrame />
            {focusRing && (
              <span
                key={focusRing.id}
                aria-hidden
                className="pointer-events-none absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2 border-paper/90"
                style={{ left: focusRing.x, top: focusRing.y }}
              />
            )}
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
          <input
            type="file"
            accept="image/*"
            onChange={onFile}
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
        Frame the label · tap to focus
      </p>
    </div>
  );
}

/** Static survey-bracket glyph for the native-camera prompt (echoes the frame). */
function ViewfinderGlyph() {
  return (
    <span
      aria-hidden
      className="relative flex h-16 w-16 items-center justify-center"
    >
      <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-survey" />
      <span className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-survey" />
      <span className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-survey" />
      <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-survey" />
      <span className="h-3 w-3 rounded-full bg-cherry" />
    </span>
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
