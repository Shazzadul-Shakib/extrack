const MAX_RETRIES = 2;
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 8000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Reads a provider's `Retry-After` header (seconds) off an SDK error, if present. */
function retryAfterMs(error: unknown): number | null {
  const headers = (error as { headers?: Headers })?.headers;
  const raw = headers?.get?.("retry-after");
  if (!raw) return null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, MAX_DELAY_MS) : null;
}

/**
 * Retries a request a couple of times on a genuine rate-limit response, honoring the
 * provider's Retry-After header when it sends one. A receipt scan is a single one-off
 * request, not bulk traffic, so a low-tier or free-trial key's low requests-per-minute
 * limit usually clears within a few seconds — this is what lets those keys succeed
 * instead of failing on the very first throttle. `isRateLimit` must return false for a
 * quota/billing error (e.g. OpenAI's `insufficient_quota`) — waiting never fixes that.
 */
export async function withRateLimitRetry<T>(attempt: () => Promise<T>, isRateLimit: (error: unknown) => boolean): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      if (!isRateLimit(error) || i === MAX_RETRIES) throw error;
      await sleep(retryAfterMs(error) ?? BASE_DELAY_MS * 2 ** i);
    }
  }
  throw lastError;
}
