"use client";

/**
 * Brew method diagrams — line-art field diagrams (survey ink on paper,
 * technical annotations), one per brew method, each with its own motion:
 * drips, a pressing plunger, flowing espresso streams, a rising moka fill.
 * `BrewShowcase` picks one at random on mount so the landing varies per load.
 *
 * SSR renders index 0 (V60) so hydration matches; the random pick happens in an
 * effect. The diagram lives below the fold, so the swap is never seen. Pure SVG
 * + CSS keyframes (see globals.css) — the only JS is the random choice.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

const SURVEY = "rgb(var(--survey))";
const BRASS = "rgb(var(--brass))";

function drip(delay: string): CSSProperties {
  return { "--drip-dist": "34px", animationDelay: delay } as CSSProperties;
}
function rise(px: string): CSSProperties {
  return { "--brew-rise": px } as CSSProperties;
}

function Frame({
  label,
  right,
  note,
  children,
}: {
  label: string;
  right: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <figure>
      <div className="relative mx-auto w-full max-w-[17rem]">
        <span className="absolute left-0 top-4 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-survey">
          {label}
        </span>
        <span className="absolute right-0 top-14 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
          {right}
        </span>
        <span className="absolute bottom-8 right-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
          {note}
        </span>
        <svg
          viewBox="0 0 200 250"
          fill="none"
          className="w-full"
          stroke={SURVEY}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {children}
        </svg>
      </div>
      <figcaption className="mt-4 text-center font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">
        Every cup, measured &amp; kept on the record
      </figcaption>
    </figure>
  );
}

function V60() {
  return (
    <Frame label="V60 · 01" right="94°C" note="ratio 1:16">
      <ellipse cx="100" cy="44" rx="58" ry="10" />
      <path d="M42 44 L96 140" />
      <path d="M158 44 L104 140" />
      <path d="M96 140 L104 140" />
      <path d="M72 48 L99 138" opacity="0.5" />
      <path d="M100 47 L100 140" opacity="0.5" />
      <path d="M128 48 L101 138" opacity="0.5" />
      <path d="M62 58 Q100 72 138 58" stroke={BRASS} opacity="0.8" />
      <ellipse
        className="animate-drip"
        style={drip("0ms")}
        cx="100"
        cy="150"
        rx="2.4"
        ry="3.4"
        fill={BRASS}
        stroke="none"
      />
      <ellipse
        className="animate-drip"
        style={drip("650ms")}
        cx="100"
        cy="150"
        rx="2"
        ry="3"
        fill={BRASS}
        stroke="none"
      />
      <ellipse
        className="animate-drip"
        style={drip("1250ms")}
        cx="100"
        cy="150"
        rx="1.8"
        ry="2.6"
        fill={BRASS}
        stroke="none"
      />
      <ellipse cx="100" cy="176" rx="32" ry="7" />
      <path d="M70 176 Q60 210 66 232 Q72 246 100 246 Q128 246 134 232 Q140 210 130 176" />
      <path d="M132 190 Q152 196 146 216 Q144 224 134 226" opacity="0.7" />
      <clipPath id="v60-carafe">
        <path d="M70 176 Q60 210 66 232 Q72 246 100 246 Q128 246 134 232 Q140 210 130 176 Z" />
      </clipPath>
      <g clipPath="url(#v60-carafe)">
        <g className="animate-brew" style={rise("-6px")}>
          <rect
            x="58"
            y="212"
            width="84"
            height="44"
            fill={BRASS}
            opacity="0.34"
            stroke="none"
          />
          <path d="M60 213 Q100 208 140 213" stroke={BRASS} strokeWidth="1.6" />
        </g>
      </g>
    </Frame>
  );
}

function AeroPress() {
  return (
    <Frame label="AeroPress · 02" right="80°C" note="press 30s">
      {/* plunger — presses gently */}
      <g className="animate-brew" style={rise("-5px")}>
        <path d="M84 44 H116" />
        <path d="M100 44 V72" />
        <ellipse cx="100" cy="72" rx="24" ry="6" />
        <path d="M78 86 Q100 92 122 86" opacity="0.6" />
      </g>
      {/* chamber */}
      <path d="M78 72 V176" />
      <path d="M122 72 V176" />
      <path d="M78 176 Q100 187 122 176" />
      {/* graduation ticks */}
      <path d="M82 104 H90" opacity="0.5" />
      <path d="M82 120 H90" opacity="0.5" />
      <path d="M82 136 H90" opacity="0.5" />
      <path d="M82 152 H90" opacity="0.5" />
      {/* coffee in chamber */}
      <clipPath id="ap-chamber">
        <path d="M78 92 V176 Q100 187 122 176 V92 Z" />
      </clipPath>
      <g clipPath="url(#ap-chamber)">
        <rect
          x="76"
          y="150"
          width="48"
          height="40"
          fill={BRASS}
          opacity="0.3"
          stroke="none"
        />
      </g>
      {/* drips into mug */}
      <ellipse
        className="animate-drip"
        style={drip("0ms")}
        cx="100"
        cy="188"
        rx="2.2"
        ry="3.2"
        fill={BRASS}
        stroke="none"
      />
      <ellipse
        className="animate-drip"
        style={drip("800ms")}
        cx="100"
        cy="188"
        rx="1.9"
        ry="2.8"
        fill={BRASS}
        stroke="none"
      />
      {/* mug */}
      <path d="M80 206 H120 V232 Q120 244 108 244 H92 Q80 244 80 232 Z" />
      <path d="M120 212 Q134 214 132 226 Q131 232 122 232" opacity="0.7" />
    </Frame>
  );
}

function Espresso() {
  return (
    <Frame label="Espresso · 03" right="9 bar" note="25s · 1:2">
      {/* group head + portafilter */}
      <path d="M64 40 H136 V58 H64 Z" />
      <path d="M74 58 H126 L118 76 H82 Z" />
      <path d="M126 64 H176" opacity="0.8" />
      <circle cx="178" cy="64" r="4" opacity="0.8" />
      {/* spouts */}
      <path d="M90 76 L88 86" />
      <path d="M110 76 L112 86" />
      {/* flowing streams */}
      <path
        className="animate-stream"
        d="M88 88 L93 152"
        stroke={BRASS}
        strokeWidth="1.8"
      />
      <path
        className="animate-stream"
        style={{ animationDelay: "0.2s" }}
        d="M112 88 L107 152"
        stroke={BRASS}
        strokeWidth="1.8"
      />
      {/* cup */}
      <ellipse cx="100" cy="154" rx="22" ry="5" />
      <path d="M78 154 L82 198 Q84 208 100 208 Q116 208 118 198 L122 154" />
      <path d="M122 164 Q140 168 137 184 Q135 192 124 192" opacity="0.7" />
      {/* crema */}
      <path
        d="M82 160 Q100 166 118 160"
        stroke={BRASS}
        strokeWidth="1.4"
        opacity="0.9"
      />
    </Frame>
  );
}

function Moka() {
  return (
    <Frame label="Moka · 04" right="stovetop" note="ratio 1:10">
      {/* bottom chamber (faceted) */}
      <path d="M62 238 L58 200 L78 176 H122 L142 200 L138 238 Z" />
      {/* waist */}
      <path d="M78 176 H122" />
      {/* top chamber */}
      <path d="M80 176 L84 140" />
      <path d="M120 176 L116 140" />
      <path d="M84 140 L94 124 H106 L116 140" />
      {/* lid knob */}
      <path d="M100 124 V116" />
      <circle cx="100" cy="112" r="4" />
      {/* spout */}
      <path d="M116 148 L130 141 L125 152" />
      {/* handle */}
      <path d="M80 150 Q56 150 56 174 Q56 188 74 192" opacity="0.75" />
      {/* rising coffee in top chamber */}
      <clipPath id="moka-top">
        <path d="M84 140 L84 176 H116 L116 140 L106 124 H94 Z" />
      </clipPath>
      <g clipPath="url(#moka-top)">
        <g className="animate-brew" style={rise("-8px")}>
          <rect
            x="82"
            y="150"
            width="36"
            height="30"
            fill={BRASS}
            opacity="0.32"
            stroke="none"
          />
          <path d="M84 151 Q100 147 116 151" stroke={BRASS} strokeWidth="1.4" />
        </g>
      </g>
      {/* water line hint */}
      <path d="M66 214 H134" opacity="0.4" />
    </Frame>
  );
}

const METHODS = [V60, AeroPress, Espresso, Moka];

export function BrewShowcase({ className }: { className?: string }) {
  // SSR/first render = index 0 (stable, no hydration mismatch); randomize after
  // mount. It's below the fold, so the swap is never visible.
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(Math.floor(Math.random() * METHODS.length));
  }, []);
  const Diagram = METHODS[index];
  return (
    <div className={className}>
      <Diagram />
    </div>
  );
}
