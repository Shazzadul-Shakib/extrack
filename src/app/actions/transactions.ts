"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { createTransaction, createTransactionsBatch, updateTransaction, deleteTransaction, MutationError } from "@/lib/mutations";
import { getTransactionsPage, getUserWallets, type TransactionsPage } from "@/lib/queries";
import type { TransactionFilters } from "@/lib/transactionFilters";
import { isIsolatedWalletType } from "@/lib/finance";
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

type TransactionInput = ReturnType<typeof parseInput>["input"];

/** Wallet-type rules that apply to every new transaction. Returns an error message, or null when allowed. */
async function walletAccessError(userId: string, inputs: TransactionInput[], settle: boolean): Promise<string | null> {
  // Debt and lend wallets are isolated: only the Debts / Lend pages (which send `settle`) may
  // clear a debt or collect a repayment. Everywhere else a transaction can't touch them.
  // An investment wallet is never reachable from here, `settle` or not — its money only moves
  // through its investment.
  const wallets = await getUserWallets(userId);
  const touches = (ids: string[]) =>
    inputs.some((input) => ids.includes(input.walletId) || (!!input.toWalletId && ids.includes(input.toWalletId)));
  if (touches(wallets.filter((w) => w.type === "investment").map((w) => w.id))) {
    return "Investment wallets can only be changed from the Investments page.";
  }
  if (!settle && touches(wallets.filter((w) => isIsolatedWalletType(w.type)).map((w) => w.id))) {
    return "Debt and lend wallets can only be changed from their own pages.";
  }
  return null;
}

function revalidateTransactionPages() {
  revalidatePath("/dashboard");
  revalidatePath("/wallets");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/savings");
  revalidatePath("/debts");
  revalidatePath("/lend");
}

const MAX_BATCH_ITEMS = 20;

/** "Separate entries" submit: one shared wallet/category/date, a name + amount per item. All or none are saved. */
async function createSeparateTransactions(userId: string, formData: FormData): Promise<TransactionFormState> {
  const kind = str(formData, "kind") as TransactionKind;
  const walletId = str(formData, "walletId");
  const category = str(formData, "category");
  const date = str(formData, "date");
  const names = formData.getAll("itemName").map((v) => (typeof v === "string" ? v.trim() : ""));
  const amounts = formData.getAll("itemAmount").map((v) => Number(typeof v === "string" ? v.trim() : ""));

  const fieldErrors: Record<string, string> = {};
  if (kind !== "expense" && kind !== "income") fieldErrors.kind = "Pick a type.";
  if (!walletId) fieldErrors.walletId = "Pick a wallet.";
  if (!category) fieldErrors.category = "Pick a category.";
  if (!date || Number.isNaN(Date.parse(date))) fieldErrors.date = "Pick a valid date.";
  if (names.length === 0 || names.length > MAX_BATCH_ITEMS) {
    fieldErrors.items = `Add between 1 and ${MAX_BATCH_ITEMS} items.`;
  } else if (names.length !== amounts.length || amounts.some((a) => !Number.isFinite(a) || a <= 0)) {
    fieldErrors.items = "Enter an amount greater than 0 for every item.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const inputs: TransactionInput[] = names.map((note, i) => ({
    kind,
    walletId,
    toWalletId: null,
    category,
    amount: amounts[i],
    date,
    note,
  }));

  const accessError = await walletAccessError(userId, inputs, false);
  if (accessError) return { error: accessError };

  try {
    await createTransactionsBatch(userId, inputs);
  } catch (error) {
    return { error: error instanceof MutationError ? error.message : "Could not save these transactions." };
  }
  revalidateTransactionPages();
  return { success: true };
}

export async function createTransactionAction(
  _prevState: TransactionFormState,
  formData: FormData
): Promise<TransactionFormState> {
  const user = await requireUser();
  if (formData.has("itemName")) return createSeparateTransactions(user.id, formData);

  const { input, fieldErrors } = parseInput(formData);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const accessError = await walletAccessError(user.id, [input], str(formData, "settle") === "1");
  if (accessError) return { error: accessError };

  try {
    await createTransaction(user.id, input);
  } catch (error) {
    return { error: error instanceof MutationError ? error.message : "Could not save this transaction." };
  }

  revalidateTransactionPages();
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
