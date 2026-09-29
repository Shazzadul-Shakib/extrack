import { GoogleGenAI, ApiError } from "@google/genai";
import { buildExtractionPrompt } from "./prompt";
import { parseExtractionResponse } from "./parse";
import { LlmExtractionError } from "./errors";
import { withRateLimitRetry } from "./retry";
import type { ExtractReceiptResult } from "./types";

// Verify this is still a current, free-tier-eligible, vision-capable model at
// ai.google.dev/gemini-api/docs/pricing before relying on it in production.
const MODEL = "gemini-3.8-flash";

export async function extractWithGoogle(apiKey: string, imageBase64: string, mediaType: string): Promise<ExtractReceiptResult> {
  const client = new GoogleGenAI({ apiKey });
  const { system, userInstruction } = buildExtractionPrompt();

  let text: string | undefined;
  try {
    const response = await withRateLimitRetry(
      () =>
        client.models.generateContent({
          model: MODEL,
          config: { systemInstruction: system },
          contents: [{ inlineData: { mimeType: mediaType, data: imageBase64 } }, { text: userInstruction }],
        }),
      (error) => error instanceof ApiError && error.status === 429
    );
    text = response.text;
  } catch (error) {
    if (error instanceof ApiError) {
      // The SDK exposes only a numeric HTTP `status` + `message` (no typed subclasses like the
      // Anthropic/OpenAI SDKs, and no separate machine-readable error code) — an invalid key
      // surfaces as a 400 whose message says so, which is the only way to tell it apart from
      // any other malformed-request 400.
      if (error.status === 400 && /api key not valid/i.test(error.message)) {
        throw new LlmExtractionError("invalid_key", "That Gemini API key was rejected.");
      }
      if (error.status === 401 || error.status === 403) {
        throw new LlmExtractionError("invalid_key", "That Gemini API key was rejected.");
      }
      if (error.status === 429) {
        throw new LlmExtractionError("rate_limited", "Gemini is rate-limiting this key right now.");
      }
      throw new LlmExtractionError("provider_error", "Gemini couldn't process this receipt.");
    }
    throw error;
  }

  if (!text) {
    throw new LlmExtractionError("malformed_response", "Gemini didn't return a readable result.");
  }
  return parseExtractionResponse(text);
}
