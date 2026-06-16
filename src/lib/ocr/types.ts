/**
 * Shared OCR types for the benchmark and the scan pipeline.
 * Framework-agnostic on purpose — no React, no Next imports — so a future
 * React Native client can consume the same logic.
 */

/** The four structured fields the scan pipeline extracts from a coffee label. */
export type LabelField = "roaster" | "origin" | "process" | "tastingNotes";

/** Ordered list of the fields, handy for iterating reports deterministically. */
export const LABEL_FIELDS: LabelField[] = [
  "roaster",
  "origin",
  "process",
  "tastingNotes",
];

/** Human-friendly column headings for reports. */
export const LABEL_FIELD_LABELS: Record<LabelField, string> = {
  roaster: "Roaster Name",
  origin: "Origin",
  process: "Process",
  tastingNotes: "Tasting Notes",
};

/** Raw output of an OCR engine for a single image. */
export interface OcrResult {
  /** Full plain-text transcription returned by the engine. */
  rawText: string;
  /**
   * Engine-reported confidence for the whole document, normalised to 0..1.
   * `undefined` when the provider does not return a usable figure.
   */
  documentConfidence?: number;
  /** Wall-clock latency of the OCR call, in milliseconds. */
  latencyMs: number;
}

/**
 * A swappable OCR backend. The benchmark runs the same images
 * through every registered provider; the chosen one is later wired into
 * `POST /api/scan`.
 */
export interface OcrProvider {
  /** Stable machine id, e.g. `"google-vision"`. */
  readonly id: string;
  /** Display name for reports/ADR. */
  readonly displayName: string;
  /** Run OCR on raw image bytes. `mimeType` is a hint some engines accept. */
  recognize(image: Buffer | Uint8Array, mimeType?: string): Promise<OcrResult>;
}
