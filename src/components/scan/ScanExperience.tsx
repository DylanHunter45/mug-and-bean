"use client";

/**
 * ScanExperience - orchestrates how a label gets captured, then previews it.
 *
 * Source selection is device-aware: on a desktop (no touch) a webcam is a poor
 * document scanner, so the primary path is the phone handoff (<DesktopHandoff>)
 * with this-device camera/upload as a fallback. On a phone you already have the
 * best camera in hand, so it leads with <ScanCamera> and hides the (pointless)
 * "scan with your phone" QR. Whatever the source, a captured File flows into the
 * same preview + Retake/Continue UI - manual, webcam, upload, and handoff are
 * indistinguishable downstream. "Continue" runs OCR and shows the raw reading;
 * the structured confirmation form that consumes it lands in a later step.
 */
import { useEffect, useState } from "react";

import { DesktopHandoff } from "./DesktopHandoff";
import { ScanCamera } from "./ScanCamera";
import { buttonClasses } from "@/components/ui";
import { scanLabel, type ScanClientResult } from "@/lib/scan/scan-client";

type Source = "handoff" | "device";

export function ScanExperience() {
  const [captured, setCaptured] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // null until we've detected the device, to avoid a hydration flash.
  const [source, setSource] = useState<Source | null>(null);
  const [isTouch, setIsTouch] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanClientResult | null>(null);

  // Detect a touch/coarse pointer once mounted; default the primary source.
  useEffect(() => {
    const coarse =
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)").matches;
    setIsTouch(Boolean(coarse));
    setSource(coarse ? "device" : "handoff");
  }, []);

  // Object URLs must be revoked or they leak - tie the URL to the captured file.
  // A fresh capture (or retake) also clears any previous scan result.
  useEffect(() => {
    setResult(null);
    setScanning(false);
    if (!captured) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(captured);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [captured]);

  async function runScan() {
    if (!captured) return;
    setScanning(true);
    setResult(await scanLabel(captured));
    setScanning(false);
  }

  if (captured && previewUrl) {
    return (
      <div>
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-card border border-line bg-ink/95 sm:aspect-[4/3]">
          {/* eslint-disable-next-line @next/next/no-img-element -- a transient
              object-URL blob preview, not an optimizable static asset. */}
          <img
            src={previewUrl}
            alt="Captured coffee label"
            className="h-full w-full object-contain"
          />
        </div>
        <p className="mt-4 text-center font-mono text-eyebrow uppercase tracking-wide text-muted">
          {captured.name} · {(captured.size / 1024).toFixed(0)} KB
        </p>
        <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => setCaptured(null)}
            className={buttonClasses({ variant: "secondary", size: "md" })}
          >
            Retake
          </button>
          <button
            type="button"
            onClick={runScan}
            disabled={scanning}
            className={buttonClasses({ size: "md" })}
          >
            {scanning ? "Reading label..." : "Continue"}
          </button>
        </div>

        {result && !result.ok && (
          <p
            role="alert"
            className="mt-5 rounded-card border border-cherry/40 bg-cherry/5 px-4 py-3 text-center text-sm text-cherry-deep"
          >
            {result.message}
          </p>
        )}

        {result && result.ok && (
          <div className="mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-eyebrow uppercase tracking-wide text-survey">
                Raw label reading
              </span>
              <span className="font-mono text-eyebrow uppercase tracking-wide text-muted">
                {result.confidence != null
                  ? `${Math.round(result.confidence * 100)}% conf`
                  : "conf n/a"}{" "}
                · {result.latencyMs}ms
              </span>
            </div>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-card border border-line bg-surface-2 p-4 font-mono text-sm text-ink-soft">
              {result.text || "(no text detected)"}
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (source === null) {
    return <div className="h-64 animate-pulse rounded-card bg-surface-2" />;
  }

  if (source === "handoff") {
    return (
      <div className="flex flex-col gap-5">
        <DesktopHandoff onImage={setCaptured} />
        <button
          type="button"
          onClick={() => setSource("device")}
          className="self-center font-mono text-eyebrow uppercase tracking-wide text-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cherry"
        >
          Or use this device&apos;s camera
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ScanCamera onCapture={setCaptured} />
      {/* Only offer the phone handoff when this isn't already a phone. */}
      {!isTouch && (
        <button
          type="button"
          onClick={() => setSource("handoff")}
          className="self-center font-mono text-eyebrow uppercase tracking-wide text-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cherry"
        >
          Or scan with your phone
        </button>
      )}
    </div>
  );
}
