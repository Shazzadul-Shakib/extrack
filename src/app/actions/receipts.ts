"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { createTransactionsBatch, MutationError } from "@/lib/mutations";
import { RECEIPT_CATEGORY_NAMES } from "@/lib/llm/prompt";
import type { TransactionInput } from "@/lib/mutations";

export interface ReceiptGroupInput {
  category: string;
  amount: number;
  date: string;
  note: string;
}

export interface CreateReceiptTransactionsState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  createdCount?: number;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const CATEGORY_SET = new Set(RECEIPT_CATEGORY_NAMES);

export async function createReceiptTransactionsAction(
  _prevState: CreateReceiptTransactionsState,
  formData: FormData
): Promise<CreateReceiptTransactionsState> {
  const user = await requireUser();
  const walletId = str(formData, "walletId");
  const groupsRaw = str(formData, "groups");

  const fieldErrors: Record<string, string> = {};
  if (!walletId) fieldErrors.walletId = "Pick a wallet.";

  let groups: ReceiptGroupInput[] = [];
  try {
    groups = JSON.parse(groupsRaw);
    if (!Array.isArray(groups)) throw new Error("not an array");
  } catch {
    return { error: "Could not read the confirmed expenses." };
  }

  if (groups.length === 0) fieldErrors.groups = "Add at least one expense.";
  for (const group of groups) {
    if (!CATEGORY_SET.has(group.category)) {
      fieldErrors.groups = "Pick a valid category for every row.";
      break;
    }
    if (!Number.isFinite(group.amount) || group.amount <= 0) {
      fieldErrors.groups = "Every row needs an amount greater than 0.";
      break;
    }
    if (!group.date || Number.isNaN(Date.parse(group.date))) {
      fieldErrors.groups = "Every row needs a valid date.";
      break;
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const inputs: TransactionInput[] = groups.map((g) => ({
    walletId,
    toWalletId: null,
    kind: "expense" as const,
    category: g.category,
    amount: g.amount,
    date: g.date,
    note: g.note,
  }));

  try {
    await createTransactionsBatch(user.id, inputs);
  } catch (error) {
    return { error: error instanceof MutationError ? error.message : "Could not save these transactions." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/wallets");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/savings");
  revalidatePath("/debts");
  revalidatePath("/lend");
  return { success: true, createdCount: groups.length };
}
