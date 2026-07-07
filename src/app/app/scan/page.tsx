/**
 * Scan a label (/app/scan).
 *
 * Entry point to the label-scanning pipeline. The protected app layout already
 * enforces auth, so this page just frames the capture experience. The heavy
 * lifting (camera, fallback, capture) is client-side in <ScanExperience>.
 */
import type { Metadata } from "next";

import { ScanExperience } from "@/components/scan/ScanExperience";

export const metadata: Metadata = {
  title: "Scan a label",
};

export default function ScanPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-eyebrow uppercase tracking-wide text-survey">
          Add to cellar
        </span>
        <h1 className="text-balance font-display text-3xl font-semibold text-ink">
          Scan a coffee label
        </h1>
        <p className="max-w-prose text-ink-soft">
          Snap the bag&apos;s label and we&apos;ll read the origin, process, and
          tasting notes for you. Use your phone for the sharpest shot, or this
          device&apos;s camera - either way, upload works too.
        </p>
      </header>
      <ScanExperience />
    </div>
  );
}
