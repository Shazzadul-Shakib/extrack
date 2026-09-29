import Anthropic from "@anthropic-ai/sdk";
import { buildExtractionPrompt } from "./prompt";
import { parseExtractionResponse } from "./parse";
import { LlmExtractionError } from "./errors";
import { withRateLimitRetry } from "./retry";
import type { ExtractReceiptResult } from "./types";

const MODEL = "claude-opus-5";

export async function extractWithAnthropic(
  apiKey: string,
  imageBase64: string,
  mediaType: string
): Promise<ExtractReceiptResult> {
  const client = new Anthropic({ apiKey });
  const { system, userInstruction } = buildExtractionPrompt();

  let response;
  try {
    response = await withRateLimitRetry(
      () =>
        client.messages.create({
          model: MODEL,
          max_tokens: 4096,
          system,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/webp", data: imageBase64 },
                },
                { type: "text", text: userInstruction },
              ],
            },
          ],
        }),
      (error) => error instanceof Anthropic.RateLimitError
    );
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new LlmExtractionError("invalid_key", "That Claude API key was rejected.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new LlmExtractionError("rate_limited", "Claude is rate-limiting this key right now.");
    }
    if (error instanceof Anthropic.APIError) {
      throw new LlmExtractionError("provider_error", "Claude couldn't process this receipt.");
    }
    throw error;
  }

  const text = response.content.find((block): block is Anthropic.TextBlock => block.type === "text")?.text;
  if (!text) {
    throw new LlmExtractionError("malformed_response", "Claude didn't return a readable result.");
  }
  return parseExtractionResponse(text);
}
