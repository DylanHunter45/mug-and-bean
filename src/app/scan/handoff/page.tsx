/**
 * Phone handoff capture (/scan/handoff) - PUBLIC (no auth).
 *
 * Opened by scanning the QR shown on the desktop scan page. It's deliberately
 * outside `/app` so the phone needs no login: authorization is the one-shot
 * signed-upload token carried in the URL hash. A standalone, branded shell (not
 * the protected app chrome) since this is a throwaway one-task screen. Marked
 * noindex - these URLs are ephemeral and single-use.
 */
import type { Metadata } from "next";

import { HandoffCapture } from "@/components/scan/HandoffCapture";

export const metadata: Metadata = {
  title: "Scan a label",
  robots: { index: false, follow: false },
};

export default function HandoffPage() {
  return (
    <main className="min-h-screen bg-paper px-6 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-8">
        <span className="text-center font-display text-lg font-semibold tracking-tight text-ink">
          Mug<span className="text-cherry">&amp;</span>Bean
        </span>
        <HandoffCapture />
      </div>
    </main>
  );
}
