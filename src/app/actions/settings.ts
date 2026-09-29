"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { saveLlmProviderSettings, removeLlmApiKey } from "@/lib/mutations";
import { getUserSettings } from "@/lib/queries";
import type { LlmProvider } from "@prisma/client";

export interface LlmSettingsFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveLlmSettingsAction(
  _prevState: LlmSettingsFormState,
  formData: FormData
): Promise<LlmSettingsFormState> {
  const user = await requireUser();
  const provider = str(formData, "provider") as LlmProvider;
  const apiKey = str(formData, "apiKey");

  const fieldErrors: Record<string, string> = {};
  if (!["anthropic", "openai", "google"].includes(provider)) fieldErrors.provider = "Pick a provider.";

  if (Object.keys(fieldErrors).length === 0) {
    const current = await getUserSettings(user.id);
    const hasExisting =
      provider === "anthropic" ? current.hasAnthropicKey : provider === "openai" ? current.hasOpenaiKey : current.hasGoogleKey;
    if (!apiKey && !hasExisting) fieldErrors.apiKey = "Paste your API key.";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    await saveLlmProviderSettings(user.id, provider, apiKey || null);
  } catch {
    return { error: "Could not save your settings." };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function removeLlmApiKeyAction(provider: LlmProvider): Promise<void> {
  const user = await requireUser();
  await removeLlmApiKey(user.id, provider);
  revalidatePath("/settings");
}
