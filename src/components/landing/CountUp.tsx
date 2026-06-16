"use client";

/**
 * CountUp — a small client island that animates a number from 0 to
 * `value` on mount. Used for the hero cupping score so the page-load moment has
 * one focal flourish. Honours `prefers-reduced-motion` by rendering the final
 * value immediately.
 */
import { useEffect, useRef, useState } from "react";

export function CountUp({
  value,
  decimals = 0,
  durationMs = 1400,
  className,
}: {
  value: number;
  decimals?: number;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const frame = useRef<number>();

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic — fast then settles, like a scale coming to rest.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, durationMs]);

  return (
    <span className={className} aria-hidden>
      {display.toFixed(decimals)}
    </span>
  );
}
