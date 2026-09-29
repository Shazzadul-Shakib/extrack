import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import type { LlmProvider } from "@prisma/client";

/** Which `UserSettings` column stores a given provider's encrypted key. */
export function keyFieldForProvider(provider: LlmProvider): "anthropicKeyEnc" | "openaiKeyEnc" | "googleKeyEnc" {
  if (provider === "anthropic") return "anthropicKeyEnc";
  if (provider === "openai") return "openaiKeyEnc";
  return "googleKeyEnc";
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const key = process.env.API_KEY_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("API_KEY_ENCRYPTION_KEY is required. Generate one with `openssl rand -hex 32`.");
  }
  const buf = Buffer.from(key, "hex");
  if (buf.length !== KEY_LENGTH) {
    throw new Error("API_KEY_ENCRYPTION_KEY must be 32 bytes, hex-encoded (64 hex characters).");
  }
  return buf;
}

/** Encrypts a user-pasted provider API key for storage. Format: `iv:authTag:ciphertext`, each hex. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${ciphertext.toString("hex")}`;
}

/** Reverses encryptSecret. Never throws — a malformed/tampered value reads as "not configured". */
export function decryptSecret(stored: string): string | null {
  const [ivHex, authTagHex, ciphertextHex] = stored.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) return null;
  try {
    const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]).toString("utf-8");
  } catch {
    return null;
  }
}
