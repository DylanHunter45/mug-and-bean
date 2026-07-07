// Twitter/X uses the same Origin Ledger preview as Open Graph - re-export the
// one generator rather than duplicating the artwork.
//
// `runtime` must be declared directly as a string literal in each route segment:
// Next.js reads it statically and does NOT follow a re-export, so re-exporting it
// leaves this image on the Node runtime, where next/og throws "Invalid URL". Pin
// it here to match opengraph-image.
export const runtime = "edge";
export { alt, size, contentType } from "./opengraph-image";
export { default } from "./opengraph-image";
