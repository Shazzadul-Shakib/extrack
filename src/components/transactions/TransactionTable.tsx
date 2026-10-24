"use client";

import { useLocale, useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { TransactionRowActions } from "./TransactionRowActions";
import { categoryIcon, categorySlot } from "@/lib/categories";
import { formatCurrency, formatDate } from "@/lib/format";
import { displayKind, type DisplayKind } from "@/lib/finance";
import type { Transaction, Wallet } from "@/lib/types";

function walletName(wallets: Wallet[], id: string | null, deletedLabel: string): string {
  if (!id) return "—";
  return wallets.find((w) => w.id === id)?.name ?? deletedLabel;
}

function AmountCell({ transaction }: { transaction: Transaction }) {
  const locale = useLocale();
  if (transaction.kind === "expense" && !transaction.investmentId) {
    return (
      <span className="font-medium text-status-critical">
        -{formatCurrency(transaction.amount, "BDT", locale)}
      </span>
    );
  }
  // A return is real income; the rest of an investment's rows just move money, so they stay neutral.
  const kind = displayKind(transaction);
  if (kind === "income" || kind === "return") {
    return (
      <span className="font-medium text-status-good">
        +{formatCurrency(transaction.amount, "BDT", locale)}
      </span>
    );
  }
  return (
    <span className="font-medium text-text-primary">
      {formatCurrency(transaction.amount, "BDT", locale)}
    </span>
  );
}

function KindBadge({ kind }: { kind: DisplayKind }) {
  const tCommon = useTranslations("Common");
  const styles: Record<DisplayKind, string> = {
    expense: "bg-status-critical-soft text-status-critical",
    income: "bg-status-good-soft text-status-good",
    transfer: "bg-brand-soft text-brand",
    invested: "bg-surface-2 text-text-secondary",
    withdrawn: "bg-surface-2 text-text-secondary",
    return: "bg-status-good-soft text-status-good",
    adjusted: "bg-surface-2 text-text-secondary",
  };
  const labels: Record<DisplayKind, string> = {
    expense: tCommon("kindExpense"),
    income: tCommon("kindIncome"),
    transfer: tCommon("kindTransfer"),
    invested: tCommon("kindInvested"),
    withdrawn: tCommon("kindWithdrawn"),
    return: tCommon("kindReturn"),
    adjusted: tCommon("kindAdjusted"),
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-medium ${styles[kind]}`}
    >
      {labels[kind]}
    </span>
  );
}

/** Optional row-selection wiring — supplied by `TransactionList`; omitted everywhere the table is read-only. */
export interface TransactionSelection {
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
}

export function TransactionTable({
  transactions,
  wallets,
  selection,
}: {
  transactions: Transaction[];
  wallets: Wallet[];
  selection?: TransactionSelection;
}) {
  const t = useTranslations("Transactions");
  const tCategories = useTranslations("Categories");
  const locale = useLocale();
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title={t("noMatchTitle")}
        description={t("noMatchDesc")}
      />
    );
  }

  const selectedCount = selection
    ? transactions.filter((t) => selection.selectedIds.has(t.id)).length
    : 0;
  const allSelected = selectedCount === transactions.length;
  const someSelected = selectedCount > 0 && !allSelected;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-180 border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-text-muted">
            {selection && (
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 cursor-pointer accent-brand align-middle"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(e) => selection.onToggleAll(e.target.checked)}
                  aria-label={t("selectAllLoaded")}
                />
              </th>
            )}
            <th className="px-4 py-3 font-medium">{t("date")}</th>
            <th className="px-4 py-3 font-medium">{t("description")}</th>
            <th className="px-4 py-3 font-medium">{t("category")}</th>
            <th className="px-4 py-3 font-medium">{t("wallet")}</th>
            <th className="px-4 py-3 font-medium">{t("type")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("amount")}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const CategoryIcon = categoryIcon(tx.category);
            const isSelected = selection?.selectedIds.has(tx.id) ?? false;
            return (
              <tr
                key={tx.id}
                className={`border-b border-border last:border-0 hover:bg-surface-2/60 ${
                  isSelected ? "bg-brand-soft/40" : ""
                }`}
              >
                {selection && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 cursor-pointer accent-brand align-middle"
                      checked={isSelected}
                      onChange={() => selection.onToggleRow(tx.id)}
                      aria-label={t("selectTransaction", { note: tx.note ?? "" })}
                    />
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                  {formatDate(tx.date, locale)}
                </td>
                <td
                  className="max-w-55 truncate px-4 py-3 text-text-primary"
                  title={tx.note || undefined}
                >
                  {tx.note || <span className="text-text-muted">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-text-secondary">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: `var(--series-${categorySlot(tx.category)})`,
                      }}
                    />
                    <CategoryIcon
                      className="h-3.5 w-3.5 shrink-0"
                      strokeWidth={2}
                      aria-hidden
                    />
                    {tCategories(tx.category)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                  {tx.kind === "transfer" ? (
                    <span>
                      {walletName(wallets, tx.walletId, t("deletedWallet"))}{" "}
                      <span className="text-text-muted">→</span>{" "}
                      {walletName(wallets, tx.toWalletId, t("deletedWallet"))}
                    </span>
                  ) : (
                    walletName(wallets, tx.walletId, t("deletedWallet"))
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <KindBadge kind={displayKind(tx)} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  <AmountCell transaction={tx} />
                </td>
                <td className="whitespace-nowrap px-2 py-3">
                  {/* A row an investment entry created is managed from that investment. */}
                  {!tx.investmentId && <TransactionRowActions transaction={tx} wallets={wallets} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
