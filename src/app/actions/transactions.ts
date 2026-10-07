"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { createTransaction, updateTransaction, deleteTransaction, MutationError } from "@/lib/mutations";
import { getTransactionsPage, getUserWallets, type TransactionsPage } from "@/lib/queries";
import type { TransactionFilters } from "@/lib/transactionFilters";
import type { TransactionKind } from "@/lib/types";

export interface TransactionFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseInput(formData: FormData) {
  const kind = str(formData, "kind") as TransactionKind;
  const walletId = str(formData, "walletId");
  const toWalletId = str(formData, "toWalletId") || null;
  const category = str(formData, "category");
  const amountRaw = str(formData, "amount");
  const date = str(formData, "date");
  const note = str(formData, "note");
  const amount = Number(amountRaw);

  const fieldErrors: Record<string, string> = {};
  if (!["expense", "income", "transfer"].includes(kind)) fieldErrors.kind = "Pick a type.";
  if (!walletId) fieldErrors.walletId = kind === "transfer" ? "Pick a source wallet." : "Pick a wallet.";
  if (kind === "transfer" && !toWalletId) fieldErrors.toWalletId = "Pick a destination wallet.";
  if (kind === "transfer" && toWalletId && toWalletId === walletId) fieldErrors.toWalletId = "Choose a different wallet.";
  if (kind !== "transfer" && !category) fieldErrors.category = "Pick a category.";
  if (!amountRaw || !Number.isFinite(amount) || amount <= 0) fieldErrors.amount = "Enter an amount greater than 0.";
  if (!date || Number.isNaN(Date.parse(date))) fieldErrors.date = "Pick a valid date.";

  return { input: { kind, walletId, toWalletId, category, amount, date, note }, fieldErrors };
}

export async function createTransactionAction(
  _prevState: TransactionFormState,
  formData: FormData
): Promise<TransactionFormState> {
  const user = await requireUser();
  const { input, fieldErrors } = parseInput(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Debt and lend wallets are isolated: only the Debts / Lend pages (which send `settle`) may
  // clear a debt or collect a repayment. Everywhere else a transaction can't touch them.
  if (str(formData, "settle") !== "1") {
    const wallets = await getUserWallets(user.id);
    const isolated = wallets.filter((w) => w.type === "debt" || w.type === "lend").map((w) => w.id);
    if (isolated.includes(input.walletId) || (input.toWalletId && isolated.includes(input.toWalletId))) {
      return { error: "Debt and lend wallets can only be changed from their own pages." };
    }
  }

  try {
    await createTransaction(user.id, input);
  } catch (error) {
    return { error: error instanceof MutationError ? error.message : "Could not save this transaction." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/wallets");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/savings");
  revalidatePath("/debts");
  revalidatePath("/lend");
  return { success: true };
}

export async function updateTransactionAction(
  transactionId: string,
  _prevState: TransactionFormState,
  formData: FormData
): Promise<TransactionFormState> {
  const user = await requireUser();
  const { input, fieldErrors } = parseInput(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    await updateTransaction(user.id, transactionId, input);
  } catch (error) {
    return { error: error instanceof MutationError ? error.message : "Could not update this transaction." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/wallets");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/savings");
  revalidatePath("/debts");
  revalidatePath("/lend");
  return { success: true };
}

/**
 * Fetches one more page of transactions for infinite scroll. `scopeWalletIds`, when given,
 * restricts results to a wallet-type page's wallets (debts/savings) or a single wallet's history
 * — but every result is scoped to the caller's own transactions regardless of what's passed here,
 * since `requireUser` supplies the userId used in the underlying query.
 */
export async function loadMoreTransactionsAction(
  filters: TransactionFilters,
  page: number,
  scopeWalletIds?: string[]
): Promise<TransactionsPage> {
  const user = await requireUser();
  return getTransactionsPage(user.id, filters, page, scopeWalletIds ? { walletIds: scopeWalletIds } : undefined);
}

export async function deleteTransactionAction(transactionId: string): Promise<void> {
  const user = await requireUser();
  try {
    await deleteTransaction(user.id, transactionId);
  } catch {
    // Silently ignore — the row is already gone from the user's perspective.
  }
  revalidatePath("/dashboard");
  revalidatePath("/wallets");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/savings");
  revalidatePath("/debts");
  revalidatePath("/lend");
}
