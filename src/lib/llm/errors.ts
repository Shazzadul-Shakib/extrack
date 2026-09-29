export type LlmExtractionErrorCode = "invalid_key" | "rate_limited" | "quota_exceeded" | "provider_error" | "malformed_response";

export class LlmExtractionError extends Error {
  code: LlmExtractionErrorCode;

  constructor(code: LlmExtractionErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
