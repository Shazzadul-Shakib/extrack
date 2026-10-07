"use server";

import { requireUser } from "@/lib/session";
import { getWalletHistoryPage, type WalletHistoryPage } from "@/lib/queries";
import type { TransactionFilters } from "@/lib/transactionFilters";

/** Fetches one more page of a Debts / Lend / Savings history for infinite scroll — always scoped to the caller. */
export async function loadMoreWalletHistoryAction(
  type: "debt" | "lend" | "savings",
  filters: TransactionFilters,
  page: number
): Promise<WalletHistoryPage> {
  const user = await requireUser();
  if (!["debt", "lend", "savings"].includes(type)) return { items: [], hasMore: false };
  return getWalletHistoryPage(user.id, type, filters, page);
}
