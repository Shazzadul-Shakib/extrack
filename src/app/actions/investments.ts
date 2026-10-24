"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  addInvestmentEntry,
  closeInvestment,
  createInvestment,
  deleteInvestment,
  deleteInvestmentEntry,
  reopenInvestment,
  updateInvestment,
  type InvestmentInput,
} from "@/lib/investmentData";
import { MutationError } from "@/lib/mutations";
import { INVESTMENT_TYPES, type InvestmentEntryKind, type InvestmentType } from "@/lib/investments";

export interface InvestmentFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  /** Set after a create, so the caller can open the new investment. */
  id?: string;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

function revalidate(id?: string) {
  revalidatePath("/investments");
  if (id) revalidatePath(`/investments/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/wallets");
  revalidatePath("/transactions");
  revalidatePath("/tax");
}

function parseInvestment(formData: FormData): { input: InvestmentInput; fieldErrors: Record<string, string> } {
  const name = str(formData, "name");
  const type = str(formData, "type") as InvestmentType;
  const startDate = str(formData, "startDate");
  const maturityRaw = str(formData, "maturityDate");
  const rateRaw = str(formData, "ratePercent");
  const ratePercent = rateRaw ? Number(rateRaw) : null;

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Give this investment a name.";
  if (!INVESTMENT_TYPES.includes(type)) fieldErrors.type = "Pick a type.";
  if (!isDate(startDate)) fieldErrors.startDate = "Pick a valid start date.";
  if (maturityRaw && !isDate(maturityRaw)) fieldErrors.maturityDate = "Pick a valid maturity date.";
  if (maturityRaw && isDate(maturityRaw) && isDate(startDate) && maturityRaw < startDate) {
    fieldErrors.maturityDate = "Maturity can't be before the start date.";
  }
  if (ratePercent !== null && (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100)) {
    fieldErrors.ratePercent = "Enter a rate between 0 and 100.";
  }

  return {
    input: {
      name,
      type,
      institution: str(formData, "institution"),
      startDate,
      maturityDate: maturityRaw || null,
      ratePercent,
      rebateEligible: formData.get("rebateEligible") === "on",
      taxedAtSource: formData.get("taxedAtSource") === "on",
      note: str(formData, "note"),
    },
    fieldErrors,
  };
}

function fail(error: unknown, fallback: string): InvestmentFormState {
  return { error: error instanceof MutationError ? error.message : fallback };
}

export async function createInvestmentAction(_prev: InvestmentFormState, formData: FormData): Promise<InvestmentFormState> {
  const user = await requireUser();
  const { input, fieldErrors } = parseInvestment(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };
  try {
    const created = await createInvestment(user.id, input);
    revalidate();
    return { success: true, id: created.id };
  } catch (error) {
    return fail(error, "Could not save this investment.");
  }
}

export async function updateInvestmentAction(id: string, _prev: InvestmentFormState, formData: FormData): Promise<InvestmentFormState> {
  const user = await requireUser();
  const { input, fieldErrors } = parseInvestment(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };
  try {
    await updateInvestment(user.id, id, input);
  } catch (error) {
    return fail(error, "Could not save this investment.");
  }
  revalidate(id);
  return { success: true };
}

export async function deleteInvestmentAction(id: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await deleteInvestment(user.id, id);
  } catch (error) {
    return fail(error, "Could not delete this investment.");
  }
  revalidate();
  return {};
}

export async function reopenInvestmentAction(id: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await reopenInvestment(user.id, id);
  } catch (error) {
    return fail(error, "Could not reopen this investment.");
  }
  revalidate(id);
  return {};
}

const ENTRY_KINDS: InvestmentEntryKind[] = ["contribution", "return", "value_update"];

export async function addEntryAction(investmentId: string, _prev: InvestmentFormState, formData: FormData): Promise<InvestmentFormState> {
  const user = await requireUser();
  const kind = str(formData, "kind") as InvestmentEntryKind;
  const amountRaw = str(formData, "amount");
  const amount = Number(amountRaw);
  const date = str(formData, "date");

  const fieldErrors: Record<string, string> = {};
  if (!ENTRY_KINDS.includes(kind)) fieldErrors.kind = "Pick what happened.";
  if (!amountRaw || !Number.isFinite(amount) || amount <= 0) fieldErrors.amount = "Enter an amount greater than 0.";
  if (!isDate(date)) fieldErrors.date = "Pick a valid date.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    await addInvestmentEntry(user.id, investmentId, {
      kind,
      amount,
      date,
      walletId: str(formData, "walletId") || null,
      note: str(formData, "note"),
    });
  } catch (error) {
    return fail(error, "Could not save this entry.");
  }
  revalidate(investmentId);
  return { success: true };
}

export async function closeInvestmentAction(id: string, _prev: InvestmentFormState, formData: FormData): Promise<InvestmentFormState> {
  const user = await requireUser();
  const receivedRaw = str(formData, "received");
  const received = receivedRaw ? Number(receivedRaw) : 0;
  const date = str(formData, "date");
  const walletId = str(formData, "walletId");

  const fieldErrors: Record<string, string> = {};
  if (!Number.isFinite(received) || received < 0) fieldErrors.received = "Enter 0 or more.";
  if (!isDate(date)) fieldErrors.date = "Pick a valid date.";
  if (received > 0 && !walletId) fieldErrors.walletId = "Pick the wallet the money goes to.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    await closeInvestment(user.id, id, { date, received, walletId, note: str(formData, "note") });
  } catch (error) {
    return fail(error, "Could not close this investment.");
  }
  revalidate(id);
  return { success: true };
}

export async function deleteEntryAction(investmentId: string, entryId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await deleteInvestmentEntry(user.id, entryId);
  } catch (error) {
    return fail(error, "Could not remove this entry.");
  }
  revalidate(investmentId);
  return {};
}
