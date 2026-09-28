"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin, requireUser } from "@/lib/session";
import { FEATURE_DESCRIPTION_MAX, FEATURE_STATUSES, FEATURE_TITLE_MAX, FEATURE_TITLE_MIN } from "@/lib/featureConstants";
import {
  FeatureError,
  createFeatureRequest,
  deleteFeatureRequest,
  setFeatureVote,
  updateFeatureStatus,
} from "@/lib/features";
import type { FeatureStatus } from "@/lib/types";

export interface FeatureFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  /** What was typed, echoed back on a failed submit — React clears an uncontrolled form after every action. */
  values?: { title: string; description: string };
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function refresh() {
  revalidatePath("/[locale]/updates", "page");
  revalidatePath("/[locale]/admin", "layout");
}

export async function createFeatureRequestAction(
  _prevState: FeatureFormState,
  formData: FormData
): Promise<FeatureFormState> {
  const user = await requireUser();
  const t = await getTranslations("Features.errors");
  const title = str(formData, "title");
  const description = str(formData, "description");

  const fieldErrors: Record<string, string> = {};
  if (title.length < FEATURE_TITLE_MIN) fieldErrors.title = t("titleTooShort", { min: FEATURE_TITLE_MIN });
  else if (title.length > FEATURE_TITLE_MAX) fieldErrors.title = t("titleTooLong", { max: FEATURE_TITLE_MAX });
  if (description.length > FEATURE_DESCRIPTION_MAX) fieldErrors.description = t("descriptionTooLong", { max: FEATURE_DESCRIPTION_MAX });
  const values = { title, description };
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  try {
    await createFeatureRequest(user.id, { title, description });
  } catch (error) {
    if (error instanceof FeatureError && error.code === "rate_limited") return { error: t("rateLimited"), values };
    return { error: t("createFailed"), values };
  }

  refresh();
  return { success: true };
}

/** Like or un-like a request. `liked` is the desired end state. */
export async function setFeatureVoteAction(featureRequestId: string, liked: boolean): Promise<{ ok: boolean }> {
  const user = await requireUser();
  try {
    await setFeatureVote(user.id, featureRequestId, liked);
  } catch {
    return { ok: false };
  }
  refresh();
  return { ok: true };
}

export async function updateFeatureStatusAction(featureRequestId: string, status: FeatureStatus): Promise<void> {
  await requireAdmin();
  if (!FEATURE_STATUSES.includes(status)) return;
  await updateFeatureStatus(featureRequestId, status);
  refresh();
}

export async function deleteFeatureRequestAction(featureRequestId: string): Promise<void> {
  await requireAdmin();
  await deleteFeatureRequest(featureRequestId);
  refresh();
}
