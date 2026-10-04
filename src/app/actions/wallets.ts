"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { createWallet, updateWallet, deleteWallet, MutationError } from "@/lib/mutations";
import type { Wallet, WalletType } from "@/lib/types";

export interface WalletFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  /** The wallet just created — lets a caller (e.g. an inline "create wallet" flow) pick it up without a full page refresh. */
  wallet?: Wallet;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function createWalletCore(formData: FormData): Promise<WalletFormState> {
  const user = await requireUser();
  const name = str(formData, "name");
  const type = str(formData, "type") as WalletType;
  const balanceRaw = str(formData, "balance");
  const note = str(formData, "note");
  const balance = balanceRaw ? Number(balanceRaw) : 0;
  const fundingWalletId = str(formData, "fundingWalletId") || null;
  const openingRaw = str(formData, "openingBalance");
  const openingBalance = openingRaw ? Number(openingRaw) : null;
  const receivedRaw = str(formData, "receivedAmount");
  const receivedAmount = receivedRaw ? Number(receivedRaw) : null;

  const fieldErrors: Record<string, string> = {};
  if (name.length < 1) fieldErrors.name = "Give this wallet a name.";
  if (!["cash", "bank", "savings", "debt", "lend"].includes(type)) fieldErrors.type = "Pick a wallet type.";
  if (!Number.isFinite(balance) || balance < 0) fieldErrors.balance = "Enter a starting balance of 0 or more.";
  if (openingBalance !== null && (!Number.isFinite(openingBalance) || openingBalance < 0)) {
    fieldErrors.openingBalance = "Enter an opening balance of 0 or more.";
  }
  if (receivedAmount !== null && (!Number.isFinite(receivedAmount) || receivedAmount <= 0 || receivedAmount > balance)) {
    fieldErrors.receivedAmount = "Enter an amount above 0 and no more than the debt.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    const wallet = await createWallet(user.id, { name, type, balance, currency: "BDT", note, fundingWalletId, receivedAmount, openingBalance });
    return { success: true, wallet };
  } catch (error) {
    return { error: error instanceof MutationError ? error.message : "Could not create this wallet." };
  }
}

export async function createWalletAction(
  _prevState: WalletFormState,
  formData: FormData
): Promise<WalletFormState> {
  const result = await createWalletCore(formData);
  if (result.success) {
    revalidatePath("/wallets");
    revalidatePath("/dashboard");
    revalidatePath("/savings");
    revalidatePath("/debts");
    revalidatePath("/lend");
    revalidatePath("/transactions");
    // A funded wallet (fundingWalletId) records a transfer under the hood — one that can
    // land in a budgeted category (Savings/Debt/Lend) for the current month.
    revalidatePath("/budgets");
  }
  return result;
}

/**
 * Used by the inline "create a wallet" flow inside Add transaction (when
 * "Debt"/"Savings" is picked as an expense category and none exists yet).
 * Deliberately skips revalidation — revalidating the current route here
 * forces a full router refresh that resets the enclosing transaction modal's
 * own open/closed state. The transaction submitted right after already
 * revalidates every path this wallet could show up on.
 */
export async function quickCreateWalletAction(
  _prevState: WalletFormState,
  formData: FormData
): Promise<WalletFormState> {
  return createWalletCore(formData);
}

export async function updateWalletAction(
  walletId: string,
  _prevState: WalletFormState,
  formData: FormData
): Promise<WalletFormState> {
  const user = await requireUser();
  const name = str(formData, "name");
  const note = str(formData, "note");
  if (name.length < 1) return { fieldErrors: { name: "Give this wallet a name." } };

  try {
    await updateWallet(user.id, walletId, { name, note });
  } catch (error) {
    return { error: error instanceof MutationError ? error.message : "Could not update this wallet." };
  }

  revalidatePath("/wallets");
  revalidatePath(`/wallets/${walletId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteWalletAction(walletId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await deleteWallet(user.id, walletId);
  } catch (error) {
    return { error: error instanceof MutationError ? error.message : "Could not delete this wallet." };
  }
  revalidatePath("/wallets");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/savings");
  revalidatePath("/debts");
  revalidatePath("/lend");
  return {};
}
