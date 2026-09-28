import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const stored = Buffer.from(hash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

// Every instance of the app must sign/verify with the same secret, so it has
// to come from the environment rather than being generated locally.
function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is required. Generate one with `openssl rand -hex 32`.");
  }
  return secret;
}

/**
 * Signs `payload` into a tamper-proof `body.signature` token.
 *
 * `purpose` scopes the signature to one use of the token (e.g. "verify-email", "oauth"): it's
 * mixed into what gets signed, so a token minted for one purpose fails verification for any
 * other — an emailed verification link can't be replayed as a session cookie. Session tokens
 * pass no purpose, which keeps their signatures identical to what's already in users' browsers.
 */
export function signToken(payload: Record<string, unknown>, purpose?: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getSecret()).update(signedData(body, purpose)).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyToken<T = Record<string, unknown>>(token: string | undefined | null, purpose?: string): T | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", getSecret()).update(signedData(body, purpose)).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as T;
  } catch {
    return null;
  }
}

function signedData(body: string, purpose: string | undefined): string {
  return purpose ? `${purpose}.${body}` : body;
}

/** A URL-safe random string with `bytes` bytes of entropy — for OAuth state, PKCE verifiers, etc. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
