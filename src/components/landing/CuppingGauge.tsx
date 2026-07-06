"use client";

/**
 * CuppingGauge — a radial score dial. The cherry arc fills to `score`/`max`
 * while the centre number counts up, in one synced motion on mount. This is the
 * hero's single focal flourish (see DESIGN.md → Motion). Honours
 * `prefers-reduced-motion` by rendering the final state immediately.
 */
import { useEffect, useRef, useState } from "react";

const R = 42;
const CIRC = 2 * Math.PI * R;

export function CuppingGauge({
  score,
  max = 100,
  decimals = 1,
  durationMs = 1500,
  size = 92,
}: {
  score: number;
  max?: number;
  decimals?: number;
  durationMs?: number;
  size?: number;
}) {
  const [progress, setProgress] = useState(0); // 0 → 1
  const frame = useRef<number>();

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      setProgress(1);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutExpo — confident, decisive, settles at rest.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setProgress(eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [durationMs]);

  const fraction = (score / max) * progress;
  const offset = CIRC * (1 - fraction);

  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full -rotate-90"
        aria-hidden
      >
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="rgb(var(--line))"
          strokeWidth="7"
        />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="rgb(var(--cherry))"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute flex items-baseline gap-0.5">
        <span className="font-display text-2xl font-semibold text-cherry-deep">
          {(score * progress).toFixed(decimals)}
        </span>
      </span>
      <span className="sr-only">
        Cupping score {score.toFixed(decimals)} out of {max}
      </span>
    </span>
  );
}
