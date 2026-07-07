"use client";

/**
 * HandoffCapture - the phone side of the desktop handoff, served at the public
 * `/scan/handoff` route (no auth). It reads the signed-upload payload from the
 * URL hash, reuses <ScanCamera> to capture/upload a label frame, pushes it to
 * Supabase Storage with the one-shot token, then broadcasts to the desktop's
 * channel so it can pick up the image. The phone is a camera and nothing more -
 * it never sees the user's cellar or session.
 */
import { useEffect, useRef, useState } from "react";

import { ScanCamera } from "./ScanCamera";
import { createClient } from "@/lib/supabase/client";
import {
  HANDOFF_EVENT,
  type HandoffPayload,
  decodeHandoffPayload,
} from "@/lib/scan/handoff";

type Phase = "loading" | "ready" | "uploading" | "done" | "invalid" | "error";

export function HandoffCapture() {
  const [phase, setPhase] = useState<Phase>("loading");
  const payloadRef = useRef<HandoffPayload | null>(null);

  // The payload lives in the hash fragment (never sent to the server), so it's
  // only readable client-side after mount.
  useEffect(() => {
    const encoded = window.location.hash.replace(/^#/, "");
    const payload = encoded ? decodeHandoffPayload(encoded) : null;
    if (!payload) {
      setPhase("invalid");
      return;
    }
    payloadRef.current = payload;
    setPhase("ready");
  }, []);

  async function handleCapture(file: File) {
    const payload = payloadRef.current;
    if (!payload) return;
    setPhase("uploading");
    const supabase = createClient();
    try {
      const { error } = await supabase.storage
        .from(payload.bucket)
        .uploadToSignedUrl(payload.path, payload.token, file, {
          contentType: file.type || "image/jpeg",
        });
      if (error) throw error;

      // Ping the desktop once the object is in place. Subscribe first - a send
      // before SUBSCRIBED is dropped.
      const channel = supabase.channel(payload.channel);
      await new Promise<void>((resolve) => {
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") resolve();
        });
      });
      await channel.send({
        type: "broadcast",
        event: HANDOFF_EVENT,
        payload: {},
      });
      void supabase.removeChannel(channel);

      setPhase("done");
    } catch {
      setPhase("error");
    }
  }

  if (phase === "loading") {
    return <Centered>Loading...</Centered>;
  }

  if (phase === "invalid") {
    return (
      <Centered>
        <p className="font-display text-xl font-semibold text-ink">
          This scan link isn&apos;t valid
        </p>
        <p className="max-w-xs text-sm text-ink-soft">
          Open the scan page on your computer and scan the fresh QR code to link
          your phone.
        </p>
      </Centered>
    );
  }

  if (phase === "done") {
    return (
      <Centered>
        <span
          aria-hidden
          className="flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-survey bg-surface font-mono text-2xl text-survey"
        >
          ✓
        </span>
        <p className="font-display text-xl font-semibold text-ink">
          Sent to your computer
        </p>
        <p className="max-w-xs text-sm text-ink-soft">
          You can put your phone down - the label is on your computer screen
          now.
        </p>
      </Centered>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <span className="font-mono text-eyebrow uppercase tracking-wide text-survey">
          Phone camera
        </span>
        <h1 className="text-balance font-display text-2xl font-semibold text-ink">
          Snap the coffee label
        </h1>
        <p className="text-sm text-ink-soft">
          {phase === "uploading"
            ? "Sending to your computer..."
            : "Fill the frame with the label, then capture. It'll show up on your computer."}
        </p>
      </header>
      {phase === "error" && (
        <p
          role="alert"
          className="rounded-lg border border-red-600/40 bg-red-600/5 px-4 py-3 text-center text-sm text-red-700"
        >
          Upload failed. Try capturing again.
        </p>
      )}
      {/* ScanCamera stays mounted through "uploading" so a failed send can retry. */}
      <ScanCamera onCapture={handleCapture} />
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 text-center">
      {children}
    </div>
  );
}
