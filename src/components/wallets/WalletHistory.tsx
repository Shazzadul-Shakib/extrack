"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { History, Loader2 } from "lucide-react";
import { loadMoreWalletHistoryAction } from "@/app/actions/walletHistory";
import { Card, EmptyState } from "@/components/ui";
import { cx } from "@/components/cx";
import { formatCurrency, formatDate } from "@/lib/format";
import { parseFilters } from "@/lib/transactionFilters";
import type { WalletEvent, WalletEventType } from "@/lib/walletHistory";

const BADGE: Record<WalletEventType, string> = {
  borrowed: "bg-status-critical-soft text-status-critical",
  debtPaid: "bg-status-good-soft text-status-good",
  lent: "bg-brand-soft text-brand",
  gotPaid: "bg-status-good-soft text-status-good",
  saved: "bg-status-good-soft text-status-good",
  withdrew: "bg-status-critical-soft text-status-critical",
  opening: "bg-brand-soft text-brand",
};

/** Events where money came *from* the other wallet; the rest went *to* it. */
const FROM_OTHER: WalletEventType[] = ["debtPaid", "lent", "saved"];

/**
 * Wallet-lifecycle history for the Debts / Lend / Savings pages: when each wallet was opened and
 * for what, and every payment, repayment, deposit or withdrawal after — with the wallet on the
 * other side and the balance left. Pages in 20 at a time as you scroll; the page's search, wallet
 * and date filters (URL params) are applied on the server.
 */
export function WalletHistory({
  type,
  initialItems,
  initialHasMore,
  balanceLabel,
}: {
  type: "debt" | "lend" | "savings";
  initialItems: WalletEvent[];
  initialHasMore: boolean;
  /** Header for the running-balance column: "Still owed", "Still owed to you", "Saved so far". */
  balanceLabel: string;
}) {
  const t = useTranslations("WalletHistory");
  const tTx = useTranslations("Transactions");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(0);
  const [prevInitial, setPrevInitial] = useState(initialItems);
  const [pending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // The server re-fetches page 0 on any filter change or mutation — drop back to that fresh page.
  if (initialItems !== prevInitial) {
    setPrevInitial(initialItems);
    setItems(initialItems);
    setHasMore(initialHasMore);
    setPage(0);
  }

  useEffect(() => {
    if (!hasMore || pending) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        const nextPage = page + 1;
        startTransition(async () => {
          const filters = parseFilters(Object.fromEntries(searchParams.entries()));
          const result = await loadMoreWalletHistoryAction(type, filters, nextPage);
          setItems((prev) => [...prev, ...result.items]);
          setHasMore(result.hasMore);
          setPage(nextPage);
        });
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [page, hasMore, pending, searchParams, type]);

  if (items.length === 0) return <EmptyState icon={History} title={t("emptyTitle")} description={t("emptyDesc")} />;

  const th = "whitespace-nowrap px-3 py-2 text-[12px] font-medium text-text-muted";
  return (
    <div className="flex flex-col gap-3">
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className={th}>{t("date")}</th>
                <th className={th}>{t("what")}</th>
                <th className={th}>{t("details")}</th>
                <th className={cx(th, "text-right")}>{t("amount")}</th>
                <th className={cx(th, "text-right")}>{balanceLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((e) => {
                const details =
                  e.counterpartName !== null
                    ? t(FROM_OTHER.includes(e.type) ? "fromWallet" : "toWallet", { name: e.counterpartName })
                    : e.walletNote;
                return (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[13px] text-text-secondary">{formatDate(e.date, locale)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col items-start gap-1">
                        <span className={cx("inline-flex rounded-full px-2 py-0.5 text-[11.5px] font-medium", BADGE[e.type])}>
                          {t(`type_${e.type}`)}
                        </span>
                        <span className="text-[13px] font-medium text-text-primary">{e.walletName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-text-secondary">
                      <div>{details || "—"}</div>
                      {e.counterpartName !== null && e.walletNote && <div className="text-text-muted">{e.walletNote}</div>}
                      {e.note && <div className="text-text-muted">{e.note}</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-[13px] font-medium tabular-nums text-text-primary">
                      {formatCurrency(e.amount, "BDT", locale)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-[13px] tabular-nums text-text-secondary">
                      {formatCurrency(e.balanceAfter, "BDT", locale)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-4">
          {pending && <Loader2 className="h-4 w-4 animate-spin text-text-muted" strokeWidth={2} aria-label={tTx("loadingMore")} />}
        </div>
      )}
    </div>
  );
}
