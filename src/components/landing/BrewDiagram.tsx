"use client";

/**
 * Brew method diagrams — line-art field diagrams (survey ink on paper,
 * technical annotations), one per brew method, each with its own motion: a
 * pulsing kettle pour, a pressing plunger, a live pressure gauge over flowing
 * espresso streams, a flickering stove flame, a plunging French press, and a
 * slow cold-brew drip tower.
 *
 * `BrewShowcase` cycles through them with a crossfade (paused on hover/focus,
 * stopped once the visitor picks a method, and never auto-run under
 * prefers-reduced-motion). Pure SVG + CSS keyframes (see globals.css) — the
 * only JS is the rotation.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

const SURVEY = "rgb(var(--survey))";
const BRASS = "rgb(var(--brass))";
const SURVEY_FILL = "rgb(var(--survey) / 0.16)";

function drip(delay: string, dist = "34px", duration?: string): CSSProperties {
  return {
    "--drip-dist": dist,
    animationDelay: delay,
    ...(duration ? { animationDuration: duration } : {}),
  } as CSSProperties;
}
function rise(px: string): CSSProperties {
  return { "--brew-rise": px } as CSSProperties;
}
function press(dist: string, dur: string): CSSProperties {
  return { "--press-dist": dist, "--press-dur": dur } as CSSProperties;
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
  );
}

function V60() {
  return (
    <Frame label="V60 · 01" right="94°C" note="ratio 1:16">
      {/* gooseneck kettle spout reaching over the cone mouth */}
      <path d="M196 8 C168 2 146 8 137 24" opacity="0.9" />
      <path d="M196 17 C172 12 154 17 146 27" opacity="0.9" />
      <path d="M137 24 L146 27" opacity="0.9" />
      {/* the pour — draws in, holds, trails off, like lifting the kettle */}
      <path
        className="animate-pour"
        style={{ "--pour-len": "48" } as CSSProperties}
        d="M141 27 C138 38 124 50 115 60"
        stroke={BRASS}
        strokeWidth="1.8"
      />
      {/* dripper — a true 60° cone, double-walled rim, spiral ribs */}
      <ellipse cx="100" cy="40" rx="58" ry="10" />
      <ellipse cx="100" cy="40" rx="50" ry="8" opacity="0.4" />
      <path d="M42 40 L96 118" />
      <path d="M158 40 L104 118" />
      <path d="M96 118 L104 118" />
      <path d="M72 44 L99 116" opacity="0.5" />
      <path d="M100 43 L100 118" opacity="0.5" />
      <path d="M128 44 L101 116" opacity="0.5" />
      {/* coffee bed + bloom dome, swelling gently under the pour */}
      <g className="animate-brew" style={rise("-2px")}>
        <path d="M62 54 Q100 68 138 54" stroke={BRASS} opacity="0.8" />
        <path d="M84 59 Q100 65 116 59" stroke={BRASS} opacity="0.45" />
      </g>
      {/* drips into the server */}
      <ellipse
        className="animate-drip"
        style={drip("0ms", "36px")}
        cx="100"
        cy="126"
        rx="2.4"
        ry="3.4"
        fill={BRASS}
        stroke="none"
      />
      <ellipse
        className="animate-drip"
        style={drip("650ms", "36px")}
        cx="100"
        cy="126"
        rx="2"
        ry="3"
        fill={BRASS}
        stroke="none"
      />
      <ellipse
        className="animate-drip"
        style={drip("1250ms", "36px")}
        cx="100"
        cy="126"
        rx="1.8"
        ry="2.6"
        fill={BRASS}
        stroke="none"
      />
      {/* range server — squat glass, volume ticks, handle */}
      <ellipse cx="92" cy="170" rx="34" ry="7" />
      <path d="M58 170 Q48 208 54 230 Q60 246 92 246 Q124 246 130 230 Q136 208 126 170" />
      <path d="M128 186 Q148 192 142 212 Q140 222 129 224" opacity="0.7" />
      <path d="M62 208 H68" opacity="0.5" />
      <path d="M62 222 H68" opacity="0.5" />
      <clipPath id="v60-carafe">
        <path d="M58 170 Q48 208 54 230 Q60 246 92 246 Q124 246 130 230 Q136 208 126 170 Z" />
      </clipPath>
      <g clipPath="url(#v60-carafe)">
        <g className="animate-brew" style={rise("-6px")}>
          <rect
            x="46"
            y="210"
            width="92"
            height="40"
            fill={BRASS}
            opacity="0.34"
            stroke="none"
          />
          <path d="M48 211 Q92 206 136 211" stroke={BRASS} strokeWidth="1.6" />
        </g>
      </g>
    </Frame>
  );
}

function AeroPress() {
  return (
    <Frame label="AeroPress · 02" right="80°C" note="press 30s">
      {/* plunger — presses, holds, releases */}
      <g className="animate-press" style={press("13px", "9s")}>
        <path d="M84 40 H116" />
        <path d="M100 40 V64" />
        <ellipse cx="100" cy="68" rx="21.5" ry="5" />
        <path d="M78.5 72 Q100 79 121.5 72" opacity="0.6" />
      </g>
      {/* chamber */}
      <ellipse cx="100" cy="62" rx="22" ry="4" opacity="0.45" />
      <path d="M78 62 V176" />
      <path d="M122 62 V176" />
      <path d="M78 176 Q100 186 122 176" />
      {/* filter cap flange + paper filter */}
      <path d="M76 176 L74 181" opacity="0.7" />
      <path d="M124 176 L126 181" opacity="0.7" />
      <path d="M84 180 H116" strokeDasharray="2 3" opacity="0.5" />
      {/* graduation ticks */}
      <path d="M82 104 H90" opacity="0.5" />
      <path d="M82 120 H90" opacity="0.5" />
      <path d="M82 136 H90" opacity="0.5" />
      <path d="M82 152 H90" opacity="0.5" />
      {/* coffee in the chamber — level drops with the press */}
      <clipPath id="ap-chamber">
        <path d="M78 90 V176 Q100 186 122 176 V90 Z" />
      </clipPath>
      <g clipPath="url(#ap-chamber)">
        <g className="animate-press" style={press("9px", "9s")}>
          <rect
            x="76"
            y="146"
            width="48"
            height="42"
            fill={BRASS}
            opacity="0.3"
            stroke="none"
          />
          <path d="M78 147 Q100 151 122 147" stroke={BRASS} strokeWidth="1.4" />
        </g>
      </g>
      {/* drips into the mug */}
      <ellipse
        className="animate-drip"
        style={drip("0ms", "16px")}
        cx="100"
        cy="188"
        rx="2.2"
        ry="3.2"
        fill={BRASS}
        stroke="none"
      />
      <ellipse
        className="animate-drip"
        style={drip("900ms", "16px")}
        cx="100"
        cy="188"
        rx="1.9"
        ry="2.8"
        fill={BRASS}
        stroke="none"
      />
      {/* mug — fills as the plunger presses */}
      <path d="M80 206 H120 V232 Q120 244 108 244 H92 Q80 244 80 232 Z" />
      <path d="M120 212 Q134 214 132 226 Q131 232 122 232" opacity="0.7" />
      <clipPath id="ap-mug">
        <path d="M80 206 H120 V232 Q120 244 108 244 H92 Q80 244 80 232 Z" />
      </clipPath>
      <g clipPath="url(#ap-mug)">
        <g className="animate-press" style={press("-7px", "9s")}>
          <rect
            x="78"
            y="230"
            width="44"
            height="18"
            fill={BRASS}
            opacity="0.3"
            stroke="none"
          />
          <path d="M80 231 Q100 228 120 231" stroke={BRASS} strokeWidth="1.4" />
        </g>
      </g>
    </Frame>
  );
}

function Espresso() {
  return (
    <Frame label="Espresso · 03" right="9 bar" note="25s · 1:2">
      {/* group head housing + bolts */}
      <path d="M58 34 H142 V56 H58 Z" />
      <circle cx="66" cy="45" r="1.8" opacity="0.5" />
      <circle cx="134" cy="45" r="1.8" opacity="0.5" />
      {/* pressure gauge — live needle */}
      <path d="M142 45 H149.5" opacity="0.7" />
      <circle cx="160" cy="45" r="10.5" />
      <path d="M160 36.5 V39.5" opacity="0.5" strokeWidth="1.2" />
      <path d="M153.6 38.6 L155.7 40.7" opacity="0.5" strokeWidth="1.2" />
      <path d="M166.4 38.6 L164.3 40.7" opacity="0.5" strokeWidth="1.2" />
      <g className="animate-needle" style={{ transformOrigin: "160px 45px" }}>
        <path d="M160 45 V37.5" stroke="rgb(var(--cherry))" strokeWidth="1.5" />
      </g>
      <circle cx="160" cy="45" r="1.6" fill={SURVEY} stroke="none" />
      {/* portafilter + handle */}
      <path d="M74 56 H126 L118 74 H82 Z" />
      <path d="M126 62 H164" strokeWidth="2" />
      <path d="M164 62 H184" strokeWidth="3.5" opacity="0.9" />
      {/* spouts */}
      <path d="M92 74 L89 84" />
      <path d="M108 74 L111 84" />
      {/* twin streams — a solid pour with a flowing shimmer over it */}
      <path
        d="M89 86 C90.5 106 92 126 93 146"
        stroke={BRASS}
        strokeWidth="1.9"
        opacity="0.5"
      />
      <path
        className="animate-stream"
        d="M89 86 C90.5 106 92 126 93 146"
        stroke={BRASS}
        strokeWidth="1.9"
      />
      <path
        d="M111 86 C109.5 106 108 126 107 146"
        stroke={BRASS}
        strokeWidth="1.9"
        opacity="0.5"
      />
      <path
        className="animate-stream"
        style={{ animationDelay: "0.2s" }}
        d="M111 86 C109.5 106 108 126 107 146"
        stroke={BRASS}
        strokeWidth="1.9"
      />
      {/* demitasse on a saucer */}
      <ellipse cx="100" cy="150" rx="20" ry="4.5" />
      <path d="M80 150 L83 182 Q85 191 100 191 Q115 191 117 182 L120 150" />
      <path d="M120 158 Q136 161 133 174 Q131 181 122 181" opacity="0.7" />
      <ellipse cx="100" cy="197" rx="27" ry="4" />
      {/* crema — the level breathes as the shot builds */}
      <g className="animate-brew" style={rise("-3px")}>
        <path
          d="M84 160 Q100 165 116 160"
          stroke={BRASS}
          strokeWidth="1.4"
          opacity="0.9"
        />
      </g>
    </Frame>
  );
}

function Moka() {
  return (
    <Frame label="Moka · 04" right="stovetop" note="ratio 1:10">
      {/* bottom chamber (faceted) + facet lines */}
      <path d="M66 238 L62 200 L78 176 H122 L138 200 L134 238 Z" />
      <path d="M86 178 L82 238" opacity="0.35" />
      <path d="M114 178 L116 238" opacity="0.35" />
      {/* safety valve */}
      <circle cx="137" cy="208" r="2.5" opacity="0.8" strokeWidth="1.2" />
      {/* waist */}
      <path d="M78 176 H122" />
      {/* top chamber — flares outward, Bialetti-style */}
      <path d="M82 176 L74 140" />
      <path d="M118 176 L126 140" />
      <path d="M74 140 H126" />
      {/* lid + knob */}
      <path d="M78 140 L84 128 H116 L122 140" />
      <path d="M100 128 V120" />
      <circle cx="100" cy="116" r="4" />
      {/* spout + steam wisp */}
      <path d="M126 140 L138 130 L130 144" />
      <path
        className="animate-steam"
        d="M138 126 Q135 119 138 113 Q141 107 138 101"
        opacity="0.5"
        strokeWidth="1.2"
      />
      {/* handle */}
      <path d="M80 148 Q54 150 54 172 Q54 186 70 191" opacity="0.75" />
      {/* rising coffee in the top chamber */}
      <clipPath id="moka-top">
        <path d="M82 176 L74 140 H126 L118 176 Z" />
      </clipPath>
      <g clipPath="url(#moka-top)">
        <g className="animate-brew" style={rise("-8px")}>
          <rect
            x="72"
            y="150"
            width="56"
            height="30"
            fill={BRASS}
            opacity="0.32"
            stroke="none"
          />
          <path d="M78 151 Q100 147 122 151" stroke={BRASS} strokeWidth="1.4" />
        </g>
      </g>
      {/* water line hint */}
      <path d="M68 216 H132" opacity="0.4" />
      {/* gas flames — teal like a real burner, flickering out of step */}
      <path
        className="animate-flame"
        style={{ transformOrigin: "88px 249px", animationDelay: "0.2s" }}
        d="M88 249 C85.5 245.5 86 243 88 241 C90 243 90.5 245.5 88 249 Z"
        fill={SURVEY_FILL}
        strokeWidth="1.2"
      />
      <path
        className="animate-flame"
        style={{ transformOrigin: "100px 249px" }}
        d="M100 249 C97 245 97.5 242 100 239.5 C102.5 242 103 245 100 249 Z"
        fill={SURVEY_FILL}
        strokeWidth="1.2"
      />
      <path
        className="animate-flame"
        style={{ transformOrigin: "112px 249px", animationDelay: "0.5s" }}
        d="M112 249 C109.5 245.5 110 243 112 241 C114 243 114.5 245.5 112 249 Z"
        fill={SURVEY_FILL}
        strokeWidth="1.2"
      />
    </Frame>
  );
}

function FrenchPress() {
  return (
    <Frame label="French press · 05" right="93°C" note="coarse · 4:00">
      {/* plunger — a slow full plunge through the steep */}
      <g className="animate-press" style={press("30px", "12s")}>
        <circle cx="100" cy="44" r="4.5" />
        <path d="M100 48.5 V111" />
        <ellipse cx="100" cy="116" rx="31" ry="5" />
        <path d="M70.5 116 H129.5" strokeDasharray="2 3" opacity="0.5" />
      </g>
      {/* lid + spout */}
      <path d="M70 84 Q70 77 80 77 H120 Q130 77 130 84" />
      <path d="M64 84 H136" />
      <path d="M66 82 L59 79 L66 76" opacity="0.8" />
      {/* steam from the spout */}
      <path
        className="animate-steam"
        style={{ animationDelay: "0.8s" }}
        d="M60 72 Q57 65 60 59 Q63 53 60 47"
        opacity="0.5"
        strokeWidth="1.2"
      />
      {/* glass beaker + base */}
      <path d="M66 84 V206" />
      <path d="M134 84 V206" />
      <path d="M66 206 H134" />
      <path d="M62 210 H138" opacity="0.7" />
      <path d="M66 206 L62 210" opacity="0.7" />
      <path d="M134 206 L138 210" opacity="0.7" />
      {/* handle */}
      <path d="M134 112 Q158 114 156 138 Q154 156 134 158" opacity="0.75" />
      {/* the steep — liquid with grounds floating near the top */}
      <clipPath id="fp-glass">
        <path d="M68 86 H132 V204 H68 Z" />
      </clipPath>
      <g clipPath="url(#fp-glass)">
        <rect
          x="66"
          y="126"
          width="68"
          height="80"
          fill={BRASS}
          opacity="0.28"
          stroke="none"
        />
        <path d="M68 127 Q100 123 132 127" stroke={BRASS} strokeWidth="1.4" />
        {[
          [84, 136],
          [99, 132],
          [114, 138],
          [90, 144],
          [107, 146],
          [122, 133],
        ].map(([cx, cy]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="1.3"
            fill={BRASS}
            opacity="0.55"
            stroke="none"
          />
        ))}
      </g>
    </Frame>
  );
}

function ColdBrew() {
  return (
    <Frame label="Cold brew · 06" right="21°C" note="drip · 16 h">
      {/* tower rails + base */}
      <path d="M58 16 V246" opacity="0.2" />
      <path d="M142 16 V246" opacity="0.2" />
      <path d="M50 246 H150" opacity="0.35" />
      <path d="M58 44 H64" opacity="0.25" />
      <path d="M136 44 H142" opacity="0.25" />
      <path d="M58 118 H78" opacity="0.25" />
      <path d="M122 118 H142" opacity="0.25" />
      {/* water flask — a rounded urn */}
      <path d="M74 20 H126" />
      <path d="M74 20 Q64 28 64 42 Q64 62 82 68 H118 Q136 62 136 42 Q136 28 126 20" />
      <clipPath id="cb-vessel">
        <path d="M74 20 Q64 28 64 42 Q64 62 82 68 H118 Q136 62 136 42 Q136 28 126 20 Z" />
      </clipPath>
      <g clipPath="url(#cb-vessel)">
        <rect
          x="60"
          y="34"
          width="80"
          height="36"
          fill={SURVEY_FILL}
          stroke="none"
        />
        <path d="M67 35 H133" stroke={SURVEY} strokeWidth="1.3" opacity="0.8" />
      </g>
      {/* valve + wheel */}
      <path d="M96 68 V76" />
      <path d="M104 68 V76" />
      <path d="M96 76 L100 81 L104 76" />
      <path d="M104 72 H108" opacity="0.8" strokeWidth="1.2" />
      <circle cx="111" cy="72" r="3" opacity="0.8" strokeWidth="1.2" />
      {/* the slow drip — one unhurried drop at a time */}
      <ellipse
        className="animate-drip"
        style={drip("0ms", "24px", "3.4s")}
        cx="100"
        cy="86"
        rx="2.3"
        ry="3.2"
        fill={BRASS}
        stroke="none"
      />
      {/* coffee chamber */}
      <ellipse cx="100" cy="112" rx="22" ry="4" />
      <path d="M78 112 V162" />
      <path d="M122 112 V162" />
      <path d="M78 162 Q100 170 122 162" />
      <path d="M84 119 H116" strokeDasharray="2 3" opacity="0.5" />
      <clipPath id="cb-bed">
        <path d="M78 116 V162 Q100 170 122 162 V116 Z" />
      </clipPath>
      <g clipPath="url(#cb-bed)">
        <rect
          x="76"
          y="124"
          width="48"
          height="40"
          fill={BRASS}
          opacity="0.3"
          stroke="none"
        />
        <circle
          cx="88"
          cy="128"
          r="1.2"
          fill={BRASS}
          opacity="0.55"
          stroke="none"
        />
        <circle
          cx="100"
          cy="125"
          r="1.2"
          fill={BRASS}
          opacity="0.55"
          stroke="none"
        />
        <circle
          cx="112"
          cy="129"
          r="1.2"
          fill={BRASS}
          opacity="0.55"
          stroke="none"
        />
      </g>
      {/* outlet + second drip */}
      <path d="M100 165 V171" opacity="0.6" />
      <ellipse
        className="animate-drip"
        style={drip("1.7s", "26px", "3.4s")}
        cx="100"
        cy="176"
        rx="2.1"
        ry="3"
        fill={BRASS}
        stroke="none"
      />
      {/* carafe — filling very, very slowly */}
      <ellipse cx="100" cy="206" rx="22" ry="4.5" />
      <path d="M78 206 Q71 230 78 239 Q84 246 100 246 Q116 246 122 239 Q129 230 122 206" />
      <clipPath id="cb-carafe">
        <path d="M78 206 Q71 230 78 239 Q84 246 100 246 Q116 246 122 239 Q129 230 122 206 Z" />
      </clipPath>
      <g clipPath="url(#cb-carafe)">
        <g
          className="animate-brew"
          style={{ ...rise("-3px"), animationDuration: "6s" }}
        >
          <rect
            x="72"
            y="233"
            width="56"
            height="14"
            fill={BRASS}
            opacity="0.32"
            stroke="none"
          />
          <path d="M78 234 Q100 231 122 234" stroke={BRASS} strokeWidth="1.4" />
        </g>
      </g>
    </Frame>
  );
}

const METHODS = [
  { name: "V60", Diagram: V60 },
  { name: "AeroPress", Diagram: AeroPress },
  { name: "Espresso", Diagram: Espresso },
  { name: "Moka", Diagram: Moka },
  { name: "French press", Diagram: FrenchPress },
  { name: "Cold brew", Diagram: ColdBrew },
] as const;

const ROTATE_MS = 7000;

export function BrewShowcase({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true); // stops for good on manual pick
  const [paused, setPaused] = useState(false); // while hovered / focused

  useEffect(() => {
    if (!auto || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % METHODS.length),
      ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [auto, paused]);

  const { name, Diagram } = METHODS[index];

  return (
    <figure
      className={className}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div key={name} className="animate-fade-in">
        <Diagram />
      </div>
      <nav
        aria-label="Brew methods"
        className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5"
      >
        {METHODS.map((method, i) => (
          <button
            key={method.name}
            type="button"
            aria-current={i === index}
            onClick={() => {
              setAuto(false);
              setIndex(i);
            }}
            className={`rounded font-mono text-[0.62rem] uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cherry ${
              i === index
                ? "text-survey underline decoration-survey/50 underline-offset-4"
                : "text-muted hover:text-ink"
            }`}
          >
            {method.name}
          </button>
        ))}
      </nav>
      <figcaption className="mt-3 text-center font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">
        Every cup, measured &amp; kept on the record
      </figcaption>
    </figure>
  );
}
