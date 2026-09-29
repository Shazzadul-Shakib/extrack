import OpenAI from "openai";
import { buildExtractionPrompt } from "./prompt";
import { parseExtractionResponse } from "./parse";
import { LlmExtractionError } from "./errors";
import { withRateLimitRetry } from "./retry";
import type { ExtractReceiptResult } from "./types";

// Verify this is still a current vision-capable chat model at platform.openai.com/docs/models
// before relying on it in production — no bundled reference tracks OpenAI's lineup here.
const MODEL = "gpt-5.5";

export async function extractWithOpenAI(
  apiKey: string,
  imageBase64: string,
  mediaType: string
): Promise<ExtractReceiptResult> {
  const client = new OpenAI({ apiKey });
  const { system, userInstruction } = buildExtractionPrompt();

  let response;
  try {
    response = await withRateLimitRetry(
      () =>
        client.chat.completions.create({
          model: MODEL,
          max_tokens: 4096,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content: [
                { type: "text", text: userInstruction },
                { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
              ],
            },
          ],
        }),
      // Never retry insufficient_quota — no amount of waiting adds quota to the key.
      (error) => error instanceof OpenAI.RateLimitError && error.type !== "insufficient_quota"
    );
  } catch (error) {
    if (error instanceof OpenAI.AuthenticationError) {
      throw new LlmExtractionError("invalid_key", "That ChatGPT API key was rejected.");
    }
    if (error instanceof OpenAI.RateLimitError) {
      // OpenAI returns HTTP 429 — RateLimitError — for two unrelated cases: genuine short-term
      // throttling ("requests"/"tokens" rate limit) AND a key with no usable quota (no billing
      // set up, a free trial that's run out, or a pay-as-you-go balance at zero). Only the
      // first is fixed by waiting and retrying, so they need distinct messages. The documented
      // discriminator is `error.type === "insufficient_quota"` — `error.code` is NOT reliable
      // here, since OpenAI uses several different code values under that same type (e.g.
      // "credit_balance_exhausted"), and checking a specific code string missed those.
      if (error.type === "insufficient_quota") {
        throw new LlmExtractionError(
          "quota_exceeded",
          "This OpenAI key has no usable quota — check billing/usage on your OpenAI account."
        );
      }
      throw new LlmExtractionError("rate_limited", "OpenAI is rate-limiting this key right now.");
    }
    if (error instanceof OpenAI.APIError) {
      throw new LlmExtractionError("provider_error", "ChatGPT couldn't process this receipt.");
    }
    throw error;
  }

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new LlmExtractionError("malformed_response", "ChatGPT didn't return a readable result.");
  }
  return parseExtractionResponse(text);
}
