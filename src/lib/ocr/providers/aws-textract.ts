/**
 * AWS Textract adapter — DetectDocumentText via the AWS SDK v3.
 *
 * The SDK (`@aws-sdk/client-textract`) is an OPTIONAL, benchmark-only
 * dependency. It is imported lazily through a non-literal specifier so that
 * `tsc` and the Next build never require it to be installed — only the
 * benchmark runner needs it, and only when AWS is being measured.
 * Install it before running the AWS leg:  npm i -D @aws-sdk/client-textract
 *
 * Credentials follow the standard AWS provider chain (env vars, shared config,
 * or an SSO/instance profile). Docs:
 * https://docs.aws.amazon.com/textract/latest/dg/API_DetectDocumentText.html
 */
import type { OcrProvider, OcrResult } from "../types";

// Non-literal specifier: keeps the SDK out of static module resolution so the
// app type-checks/builds without the optional package present.
const TEXTRACT_PKG = "@aws-sdk/client-textract";

/** True when AWS credentials appear to be configured for this process. */
export function hasAwsCredentials(): boolean {
  return Boolean(
    (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
    process.env.AWS_PROFILE,
  );
}

/** Minimal shapes of the bits of the Textract response we consume. */
interface TextractBlock {
  BlockType?: string;
  Text?: string;
  Confidence?: number;
}
interface DetectDocumentTextOutput {
  Blocks?: TextractBlock[];
}

export const awsTextractProvider: OcrProvider = {
  id: "aws-textract",
  displayName: "AWS Textract (DetectDocumentText)",

  async recognize(image): Promise<OcrResult> {
    let sdk: {
      TextractClient: new (config: { region: string }) => {
        send: (cmd: unknown) => Promise<DetectDocumentTextOutput>;
      };
      DetectDocumentTextCommand: new (input: {
        Document: { Bytes: Uint8Array };
      }) => unknown;
    };
    try {
      sdk = await import(TEXTRACT_PKG);
    } catch {
      throw new Error(
        `Cannot load ${TEXTRACT_PKG}. Install it to benchmark AWS Textract: ` +
          `npm i -D ${TEXTRACT_PKG}`,
      );
    }

    const { TextractClient, DetectDocumentTextCommand } = sdk;
    const client = new TextractClient({
      region: process.env.AWS_REGION ?? "us-east-1",
    });
    const command = new DetectDocumentTextCommand({
      Document: { Bytes: new Uint8Array(image) },
    });

    const start = Date.now();
    const out = await client.send(command);
    const latencyMs = Date.now() - start;

    const lineBlocks = (out.Blocks ?? []).filter((b) => b.BlockType === "LINE");
    const rawText = lineBlocks
      .map((b) => b.Text ?? "")
      .filter(Boolean)
      .join("\n");

    const confidences = lineBlocks
      .map((b) => b.Confidence)
      .filter((c): c is number => typeof c === "number");
    const documentConfidence =
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length / 100
        : undefined;

    return { rawText, documentConfidence, latencyMs };
  },
};
