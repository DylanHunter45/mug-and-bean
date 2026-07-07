/**
 * OCR provider registry for the benchmark.
 *
 * Each entry pairs a provider with a credential check and a published
 * per-1,000-page price used only for the cost column of the report. PRICES ARE
 * ESTIMATES - verify against the vendor's current pricing page before quoting
 * them in the ADR (see PRICING_AS_OF).
 */
import type { OcrProvider } from "../types";
import { googleVisionProvider, hasGoogleCredentials } from "./google-vision";
import { awsTextractProvider, hasAwsCredentials } from "./aws-textract";

export interface ProviderEntry {
  provider: OcrProvider;
  /** Whether credentials for this provider are present in the environment. */
  hasCredentials: () => boolean;
  /**
   * Published list price per 1,000 pages, USD. ESTIMATE - see PRICING_AS_OF.
   * Google Cloud Vision Document Text Detection and AWS Textract
   * DetectDocumentText were both ~$1.50 / 1,000 pages at the first pricing
   * tier when this was written.
   */
  pricePer1000UsdEstimate: number;
  /** Link to verify the price. */
  pricingUrl: string;
}

/** When the bundled price estimates were last checked - re-verify if stale. */
export const PRICING_AS_OF = "2026-06-13";

export const PROVIDERS: Record<string, ProviderEntry> = {
  "google-vision": {
    provider: googleVisionProvider,
    hasCredentials: hasGoogleCredentials,
    pricePer1000UsdEstimate: 1.5,
    pricingUrl: "https://cloud.google.com/vision/pricing",
  },
  "aws-textract": {
    provider: awsTextractProvider,
    hasCredentials: hasAwsCredentials,
    pricePer1000UsdEstimate: 1.5,
    pricingUrl: "https://aws.amazon.com/textract/pricing/",
  },
};

export type ProviderId = keyof typeof PROVIDERS;

export {
  googleVisionProvider,
  hasGoogleCredentials,
  awsTextractProvider,
  hasAwsCredentials,
};
