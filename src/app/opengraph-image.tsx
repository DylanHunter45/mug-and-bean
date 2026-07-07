import { ImageResponse } from "next/og";

// The image generator (satori + resvg) runs on the edge runtime - the Node
// runtime mis-resolves next/og's internal asset URLs ("Invalid URL").
export const runtime = "edge";

// Rendered once at build time (static route) and served as the social preview.
export const alt =
  "Mug & Bean - catalogue every coffee worth remembering. Scan the bag, log the brew, score the cup.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Origin Ledger palette (globals.css tokens, resolved to hex - CSS vars aren't
// available inside the OG renderer).
const PAPER = "#e8dcc9";
const SURFACE = "#f7f0e4";
const LINE = "#d0c1aa";
const INK = "#2c2318";
const INK_SOFT = "#57493a";
const MUTED = "#655843";
const CHERRY = "#b43a2f";
const SURVEY = "#3c6270";

/**
 * Fetch a Google font as a binary satori can parse (ttf/otf/woff - not woff2).
 * An old User-Agent nudges Google into serving woff. Any failure returns null
 * so the image still renders (in satori's default font) and the build survives
 * an offline/blocked network.
 */
async function loadFont(query: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?${query}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko",
      },
    }).then((res) => res.text());
    const match = css.match(
      /src:\s*url\((.+?)\)\s*format\('(?:woff|truetype|opentype)'\)/,
    );
    if (!match) return null;
    return await fetch(match[1]).then((res) => res.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const [display, body] = await Promise.all([
    loadFont("family=Fraunces:opsz,wght@9..144,600"),
    loadFont("family=Hanken+Grotesk:wght@500"),
  ]);

  const fonts: {
    name: string;
    data: ArrayBuffer;
    weight: 500 | 600;
    style: "normal";
  }[] = [];
  if (display)
    fonts.push({
      name: "Fraunces",
      data: display,
      weight: 600,
      style: "normal",
    });
  if (body)
    fonts.push({
      name: "Hanken Grotesk",
      data: body,
      weight: 500,
      style: "normal",
    });

  const display600 = display ? "Fraunces" : "serif";
  const body500 = body ? "Hanken Grotesk" : "sans-serif";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        backgroundColor: PAPER,
        backgroundImage: `radial-gradient(circle at 82% 22%, ${SURFACE} 0%, ${PAPER} 55%)`,
        color: INK,
        fontFamily: body500,
        position: "relative",
      }}
    >
      {/* Contour rings - the topographic / elevation motif. */}
      <div
        style={{
          position: "absolute",
          top: -260,
          right: -220,
          width: 720,
          height: 720,
          borderRadius: "50%",
          border: `2px solid ${LINE}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.7,
        }}
      >
        <div
          style={{
            width: 520,
            height: 520,
            borderRadius: "50%",
            border: `2px solid ${LINE}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 320,
              height: 320,
              borderRadius: "50%",
              border: `2px solid ${LINE}`,
            }}
          />
        </div>
      </div>

      {/* Wordmark + catalogue tag */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: display600,
            fontSize: 40,
            fontWeight: 600,
          }}
        >
          Mug<span style={{ color: CHERRY }}>&</span>Bean
        </div>
        <div
          style={{
            fontSize: 20,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: MUTED,
          }}
        >
          Cellar Nº 014
        </div>
      </div>

      {/* Headline + subhead */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: display600,
            fontSize: 82,
            fontWeight: 600,
            lineHeight: 1.02,
            letterSpacing: -1.5,
          }}
        >
          <span>Catalogue every coffee</span>
          <span style={{ color: CHERRY }}>worth remembering.</span>
        </div>
        <div
          style={{
            fontSize: 30,
            lineHeight: 1.35,
            color: INK_SOFT,
            maxWidth: 820,
          }}
        >
          Scan the bag, log the brew, score the cup - a searchable archive of
          the specialty coffee you drink, that learns your palate.
        </div>
      </div>

      {/* The core loop, as survey waypoints */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {["Scan", "Rate", "Discover"].map((step, i) => (
          <div key={step} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 22px",
                borderRadius: 999,
                border: `2px solid ${SURVEY}`,
                color: SURVEY,
                fontSize: 26,
                fontWeight: 500,
              }}
            >
              {step}
            </div>
            {i < 2 && (
              <div
                style={{
                  width: 40,
                  fontSize: 30,
                  color: SURVEY,
                  textAlign: "center",
                }}
              >
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </div>,
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
