import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { TrendingDown, TrendingUp, Wallet as WalletIcon } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserWallets, getUserTransactions, getTransactionsPage, getTransactionsSummary } from "@/lib/queries";
import { parseFilters } from "@/lib/transactionFilters";
import { monthlyTotals, spendingBreakdown, compareCategoryTotals, SPENDING_TRANSFER_CATEGORIES } from "@/lib/finance";
import { formatCurrency, formatCompactCurrency, formatYear, currentYearMonth, shiftYearMonth, monthLabel, monthLabelShort } from "@/lib/format";
import { StatCard } from "@/components/dashboard/StatCard";
import { MonthYearPicker } from "@/components/dashboard/MonthYearPicker";
import { CompareToggle } from "@/components/budgets/CompareToggle";
import { SwapMonthsButton } from "@/components/budgets/SwapMonthsButton";
import { FilterBar } from "@/components/transactions/FilterBar";
import { TransactionList } from "@/components/transactions/TransactionList";
import { AddTransactionButton } from "@/components/transactions/AddTransactionButton";
import { CategoryComparisonTable } from "@/components/transactions/CategoryComparisonTable";
import { Card } from "@/components/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Transactions" });
  return { title: `${t("pageTitle")} — Extrack` };
}

/** Percent change from `previous` to `current`, or undefined when there's no meaningful baseline. */
function pct(current: number, previous: number): number | undefined {
  if (previous === 0) return current === 0 ? undefined : 100;
  return ((current - previous) / previous) * 100;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const [walletsWithDeleted, rawParams, t, tBudgets, tMonthYearPicker, tCategories, locale] = await Promise.all([
    getUserWallets(user.id, { includeDeleted: true }),
    searchParams,
    getTranslations("Transactions"),
    getTranslations("Budgets"),
    getTranslations("MonthYearPicker"),
    getTranslations("Categories"),
    getLocale(),
  ]);
  const filters = parseFilters(rawParams);

  // The month-comparison card below is built from `year`/`month` (its base month) and `cy`/`cm`.
  // Outside compare mode the same `year`/`month` params double as the list's month filter (see
  // `parseFilters`), so browsing one month's history and comparing months share one base month.
  const defaults = currentYearMonth();
  const year = Number(rawParams.year) || defaults.year;
  const month = Number(rawParams.month) || defaults.month;
  const compare = rawParams.compare === "1";
  const prevYM = shiftYearMonth(year, month, -1);
  const compareYear = Number(rawParams.cy) || prevYM.year;
  const compareMonth = Number(rawParams.cm) || prevYM.month;

  const [page, summary, allTransactions] = await Promise.all([
    getTransactionsPage(user.id, filters, 0),
    getTransactionsSummary(user.id, filters),
    getUserTransactions(user.id),
  ]);
  // Deleted wallets are carried through only so their name still renders on
  // past transactions; they're kept out of pickers and the wallet filter.
  const activeWallets = walletsWithDeleted.filter((w) => !w.archived && !w.deletedAt);

  const baseLabel = `${monthLabel(month, locale)} ${formatYear(year, locale)}`;
  const compareLabel = `${monthLabel(compareMonth, locale)} ${formatYear(compareYear, locale)}`;
  const compareShort = `${monthLabelShort(compareMonth, locale)} ${formatYear(compareYear, locale)}`;

  const baseTotals = monthlyTotals(allTransactions, year, month);
  const compareTotals = monthlyTotals(allTransactions, compareYear, compareMonth);
  const comparisonRows = compare
    ? compareCategoryTotals(
        spendingBreakdown(allTransactions, year, month),
        spendingBreakdown(allTransactions, compareYear, compareMonth)
      )
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">{t("pageTitle")}</h2>
          <p className="text-[13px] text-text-muted">{t("pageDesc")}</p>
        </div>
        <AddTransactionButton wallets={activeWallets} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CompareToggle active={compare} baseYear={year} baseMonth={month} />
          {compare && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <MonthYearPicker year={year} month={month} />
              <div className="flex items-center gap-2">
                <SwapMonthsButton year={year} month={month} compareYear={compareYear} compareMonth={compareMonth} />
                <span className="text-[13px] text-text-muted">{tBudgets("vs")}</span>
                <MonthYearPicker year={compareYear} month={compareMonth} yearKey="cy" monthKey="cm" ariaPrefix={tMonthYearPicker("comparison")} />
              </div>
            </div>
          )}
        </div>

        {compare && (
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-text-primary">{t("monthComparison")}</h3>
              <span className="text-[12.5px] text-text-muted">
                {baseLabel} vs {compareLabel}
              </span>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label={t("income")}
                value={baseTotals.income}
                icon={TrendingUp}
                accent="good"
                locale={locale}
                delta={pct(baseTotals.income, compareTotals.income)}
                deltaGoodDirection="up"
                deltaLabel={`vs ${compareShort}`}
              />
              <StatCard
                label={t("expense")}
                value={baseTotals.expense}
                icon={TrendingDown}
                accent="critical"
                locale={locale}
                delta={pct(baseTotals.expense, compareTotals.expense)}
                deltaGoodDirection="down"
                deltaLabel={`vs ${compareShort}`}
              />
              <StatCard
                label={t("net")}
                value={baseTotals.net}
                icon={WalletIcon}
                accent={baseTotals.net >= 0 ? "good" : "critical"}
                locale={locale}
                hint={`${compareShort}: ${formatCompactCurrency(compareTotals.net, "BDT", locale)}`}
              />
            </div>
            <CategoryComparisonTable rows={comparisonRows} baseLabel={baseLabel} compareLabel={compareLabel} />
          </Card>
        )}
      </div>

      <FilterBar wallets={activeWallets} showWalletFilter showMonthFilter={!compare} />

      <div className="flex flex-col gap-1.5 text-[13px] text-text-secondary">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <span>
            {t.rich("resultCount", {
              count: summary.count,
              b: (chunks) => <span className="font-medium text-text-primary">{chunks}</span>,
            })}
          </span>
          <span>
            {t("income")} <span className="font-medium text-status-good">+{formatCurrency(summary.incomeTotal, "BDT", locale)}</span>
          </span>
          <span>
            {t("expense")} <span className="font-medium text-status-critical">-{formatCurrency(summary.expenseTotal, "BDT", locale)}</span>
          </span>
        </div>
        {/* Debt payoffs, savings contributions and lending are transfers, but they count as spending —
            the expense total above already includes them, so show where that money went. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-text-muted">
          <span>{t("expenseIncludes")}</span>
          {SPENDING_TRANSFER_CATEGORIES.map((category) => {
            const amount = summary.transferSpending[category] ?? 0;
            return (
              <span key={category}>
                {tCategories(category)}{" "}
                <span className={amount > 0 ? "font-medium text-text-secondary" : undefined}>{formatCurrency(amount, "BDT", locale)}</span>
              </span>
            );
          })}
        </div>
      </div>

      <TransactionList initialItems={page.items} initialHasMore={page.hasMore} wallets={walletsWithDeleted} />
    </div>
  );
}
