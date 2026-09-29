import { extractWithAnthropic } from "./anthropic";
import { extractWithOpenAI } from "./openai";
import { extractWithGoogle } from "./google";
import type { ExtractReceiptResult } from "./types";
import type { LlmProvider } from "@prisma/client";

export type { ExtractReceiptResult, ExtractedCategoryGroup, ExtractedItem } from "./types";
export { LlmExtractionError } from "./errors";
export type { LlmExtractionErrorCode } from "./errors";
export { getActiveLlmCredential } from "./credentials";

export async function extractReceiptExpenses(
  provider: LlmProvider,
  apiKey: string,
  imageBase64: string,
  mediaType: string
): Promise<ExtractReceiptResult> {
  if (provider === "anthropic") return extractWithAnthropic(apiKey, imageBase64, mediaType);
  if (provider === "openai") return extractWithOpenAI(apiKey, imageBase64, mediaType);
  return extractWithGoogle(apiKey, imageBase64, mediaType);
}
