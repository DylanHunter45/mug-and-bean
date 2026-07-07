import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";

import { CtaTracker } from "@/components/analytics/CtaTracker";
import { PlausibleScript } from "@/components/analytics/PlausibleScript";
import { getSiteUrl } from "@/lib/site";

import "./globals.css";

// Body / UI — clean humanist grotesque ("Origin Ledger" system, not Inter).
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Display / headlines + wordmark — an editorial serif with character.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz"],
});

// Data voice — cupping scores, altitude, ratios, catalogue numbers.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const SITE_URL = getSiteUrl();
const TITLE = "Mug & Bean — Your digital coffee cellar";
const DESCRIPTION =
  "Scan the bag, log the brew, score the cup. Mug & Bean keeps a searchable archive of the specialty coffee you drink — origin, altitude, process, and how the cup actually scored — and learns your palate.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Mug & Bean",
  },
  description: DESCRIPTION,
  applicationName: "Mug & Bean",
  keywords: [
    "specialty coffee",
    "coffee journal",
    "coffee cellar",
    "coffee tasting notes",
    "cupping score",
    "single origin",
    "coffee label scanning",
    "coffee tracker",
  ],
  authors: [{ name: "Mug & Bean" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Mug & Bean",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${hanken.variable} ${fraunces.variable} ${plexMono.variable}`}
    >
      <body>
        {children}
        <CtaTracker />
        <PlausibleScript />
      </body>
    </html>
  );
}
