import { prisma } from "@/lib/db";
import { decryptSecret, keyFieldForProvider } from "@/lib/apiKeyCrypto";
import type { LlmProvider } from "@prisma/client";

export interface LlmCredential {
  provider: LlmProvider;
  apiKey: string;
}

/** The user's currently-active provider and its decrypted key, or null if none is configured. */
export async function getActiveLlmCredential(userId: string): Promise<LlmCredential | null> {
  const row = await prisma.userSettings.findUnique({ where: { userId } });
  if (!row?.llmProvider) return null;
  const encrypted = row[keyFieldForProvider(row.llmProvider)];
  const apiKey = encrypted ? decryptSecret(encrypted) : null;
  if (!apiKey) return null;
  return { provider: row.llmProvider, apiKey };
}
