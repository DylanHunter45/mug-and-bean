"use client";

/**
 * DesktopHandoff - "use your phone as the camera". Shown as the primary path on
 * desktop, where a webcam makes an awkward document scanner. It mints a one-shot
 * Supabase signed-upload token scoped to the signed-in user's own storage
 * folder, renders it as a QR code, and listens on a Realtime channel. The phone
 * opens the QR (no login), uploads the label frame with that token, and pings
 * the channel; we then download the image and hand it to `onImage` - the same
 * File the webcam/upload paths produce, so everything downstream is identical.
 *
 * No server state: the session lives entirely in the QR payload and the
 * ephemeral channel. See `@/lib/scan/handoff` for the shared contract.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

import { createClient } from "@/lib/supabase/client";
import { blobToFile } from "@/lib/scan/camera";
import {
  HANDOFF_EVENT,
  LABEL_SCANS_BUCKET,
  buildHandoffUrl,
  handoffChannelName,
  scanStoragePath,
} from "@/lib/scan/handoff";

type Phase = "preparing" | "waiting" | "receiving" | "error";

// Ink-on-surface so the QR matches the archive palette (hex mirrors the tokens).
const QR_DARK = "#2d251c"; // ink
const QR_LIGHT = "#faf5ec"; // surface

export interface DesktopHandoffProps {
  onImage: (file: File) => void;
}

export function DesktopHandoff({ onImage }: DesktopHandoffProps) {
  const [phase, setPhase] = useState<Phase>("preparing");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const onImageRef = useRef(onImage);
  onImageRef.current = onImage;

  const setup = useCallback(async () => {
    setPhase("preparing");
    setQrDataUrl(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPhase("error");
      return null;
    }

    const sessionId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = scanStoragePath(user.id, sessionId);
    const channelName = handoffChannelName(sessionId);

    const { data: signed, error } = await supabase.storage
      .from(LABEL_SCANS_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !signed) {
      setPhase("error");
      return null;
    }

    const url = buildHandoffUrl(window.location.origin, {
      bucket: LABEL_SCANS_BUCKET,
      path,
      token: signed.token,
      channel: channelName,
    });
    setQrDataUrl(
      await QRCode.toDataURL(url, {
        width: 232,
        margin: 1,
        color: { dark: QR_DARK, light: QR_LIGHT },
      }),
    );

    // Subscribe before showing "waiting" so we never miss the phone's ping.
    const channel = supabase.channel(channelName);
    channel
      .on("broadcast", { event: HANDOFF_EVENT }, async () => {
        setPhase("receiving");
        // Trust only the path we minted, never one echoed back by the phone.
        const { data: blob } = await supabase.storage
          .from(LABEL_SCANS_BUCKET)
          .download(path);
        if (blob) {
          onImageRef.current(blobToFile(blob));
        } else {
          setPhase("error");
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setPhase("waiting");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | null = null;
    let cancelled = false;
    void setup().then((fn) => {
      if (cancelled) fn?.();
      else cleanup = fn;
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [setup]);

  if (phase === "error") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-surface px-6 py-10 text-center">
        <p className="max-w-xs text-sm text-ink-soft">
          Couldn&apos;t start the phone handoff. Retry, or use this
          device&apos;s camera below.
        </p>
        <button
          type="button"
          onClick={() => void setup()}
          className="font-mono text-eyebrow uppercase tracking-wide text-cherry-deep underline decoration-cherry/40 underline-offset-4 transition-colors hover:text-cherry focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cherry"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 rounded-card border border-line bg-surface px-6 py-8 text-center">
      <div className="relative flex h-[248px] w-[248px] items-center justify-center overflow-hidden rounded-2xl border border-line bg-[#faf5ec]">
        {qrDataUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- a generated
             data-URL QR, not a static asset Next can optimize. */
          <img
            src={qrDataUrl}
            alt="QR code - scan with your phone to capture the label"
            width={232}
            height={232}
            className="reveal"
          />
        ) : (
          <span className="font-mono text-eyebrow uppercase tracking-wide text-muted">
            Preparing...
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-display text-lg font-semibold text-ink">
          Scan with your phone
        </p>
        <p className="max-w-xs text-sm text-ink-soft">
          Point your phone&apos;s camera at this code to snap the label - a much
          better shot than a webcam. It&apos;ll appear here automatically.
        </p>
      </div>

      <p
        className="flex items-center gap-2 font-mono text-eyebrow uppercase tracking-wide text-survey"
        role="status"
        aria-live="polite"
      >
        <span
          aria-hidden
          className={
            phase === "receiving"
              ? "h-2 w-2 rounded-full bg-survey"
              : "h-2 w-2 animate-pulse rounded-full bg-survey"
          }
        />
        {phase === "receiving"
          ? "Receiving photo..."
          : "Waiting for your phone"}
      </p>
    </div>
  );
}
