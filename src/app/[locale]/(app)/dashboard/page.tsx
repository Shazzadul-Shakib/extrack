import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CreditCard, FileText, HandCoins, PiggyBank, Target, TrendingDown, Wallet as WalletIcon } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserWallets, getUserTransactions, getUserBudgets } from "@/lib/queries";
import {
  monthlyTotals,
  monthlySavingsContribution,
  monthlySavingsReversal,
  monthlySavingsWithdrawal,
  spendingBreakdown,
  incomeExpenseTrend,
  netWorth,
  totalSavings,
  totalDebt,
  totalLend,
  totalLiquid,
  walletsByType,
  budgetProgress,
  type TrendRange,
  type TrendPoint,
} from "@/lib/finance";
import { currentYearMonth, shiftYearMonth, monthLabel, monthLabelShort, formatYear } from "@/lib/format";
import { StatCard } from "@/components/dashboard/StatCard";
import { ToggleStatCard } from "@/components/dashboard/ToggleStatCard";
import { CategoryBarChart } from "@/components/dashboard/CategoryBarChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { TrendRangeSelect } from "@/components/dashboard/TrendRangeSelect";
import { MonthYearPicker } from "@/components/dashboard/MonthYearPicker";
import { YearPicker } from "@/components/dashboard/YearPicker";
import { ViewToggle } from "@/components/dashboard/ViewToggle";
import { YearlyDashboard } from "@/components/dashboard/YearlyDashboard";
import { yearlySeries, yearlyTotals, yearlySpendingBreakdown } from "@/lib/yearly";
import { AddTransactionButton } from "@/components/transactions/AddTransactionButton";
import { WalletCard } from "@/components/wallets/WalletCard";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { BudgetTable } from "@/components/budgets/BudgetTable";
import { BudgetProgressChart } from "@/components/budgets/BudgetProgressChart";
import { CreateBudgetButton } from "@/components/budgets/CreateBudgetButton";
import { Card, EmptyState, LinkButton } from "@/components/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  return { title: `${t("pageTitle")} — Extrack` };
}

const TREND_RANGES: TrendRange[] = ["week", "month", "last-month", "6-months"];

function pct(current: number, previous: number): number | undefined {
  if (previous === 0) return current === 0 ? undefined : 100;
  return ((current - previous) / previous) * 100;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const [t, tYear, tCommon, tStatement, locale] = await Promise.all([
    getTranslations("Dashboard"),
    getTranslations("YearView"),
    getTranslations("Common"),
    getTranslations("Statement"),
    getLocale(),
  ]);
  const params = await searchParams;
  const defaults = currentYearMonth();
  const year = Number(params.year) || defaults.year;
  const month = Number(params.month) || defaults.month;
  const rawView = Array.isArray(params.view) ? params.view[0] : params.view;
  const view: "month" | "year" = rawView === "year" ? "year" : "month";
  const rawTrendRange = Array.isArray(params.trend) ? params.trend[0] : params.trend;
  const trendRange: TrendRange = TREND_RANGES.includes(rawTrendRange as TrendRange)
    ? (rawTrendRange as TrendRange)
    : "month";

  const [walletsWithDeleted, transactions, budgets] = await Promise.all([
    getUserWallets(user.id, { includeDeleted: true }),
    getUserTransactions(user.id),
    getUserBudgets(user.id),
  ]);
  // Soft-deleted wallets are kept only to resolve names for historical
  // transactions in the "Recent" list — never for totals, pickers, or previews.
  const wallets = walletsWithDeleted.filter((w) => !w.deletedAt);

  if (view === "year") {
    const months = yearlySeries(transactions, walletsWithDeleted, year);
    const totals = yearlyTotals(months);
    const series: TrendPoint[] = months.map((m) => ({
      key: `${year}-${m.month}`,
      label: monthLabelShort(m.month, locale),
      fullLabel: `${monthLabel(m.month, locale)} ${formatYear(year, locale)}`,
      income: m.income,
      expense: m.expense,
      saved: m.saved,
    }));
    const previousTotals = yearlyTotals(yearlySeries(transactions, walletsWithDeleted, year - 1));
    const yearCategories = yearlySpendingBreakdown(transactions, year);
    const recentYear = [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6);
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-text-primary">
              {t("welcomeBack", { name: user.name.split(" ")[0] })}
            </h2>
            <p className="text-[13px] text-text-muted">{tYear("lookingSoFarYear", { year: formatYear(year, locale) })}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <ViewToggle view="year" />
            <YearPicker year={year} className="w-full sm:w-auto" />
            <LinkButton href={`/statement?view=year&year=${year}`} variant="secondary" className="w-full sm:w-auto">
              <FileText className="h-4 w-4" strokeWidth={2} />
              {tStatement("statement")}
            </LinkButton>
            <AddTransactionButton wallets={wallets.filter((w) => !w.archived)} label={tCommon("add")} className="w-full sm:w-auto" />
          </div>
        </div>
        <YearlyDashboard year={year} series={series} totals={totals} previous={previousTotals} categories={yearCategories} />
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">{t("recentTransactions")}</h3>
            <Link href="/transactions" className="text-[13px] font-medium text-brand hover:underline">
              {tCommon("viewAll")} →
            </Link>
          </div>
          <TransactionTable transactions={recentYear} wallets={walletsWithDeleted} />
        </div>
      </div>
    );
  }

  // Every expense figure below comes from `monthlyTotals` / `spendingBreakdown` — the shared
  // `isSpending` rule (plain expenses + Debt payoff transfers), the same one the
  // Transactions page totals use — so the two screens can't drift apart.
  const current = monthlyTotals(transactions, year, month);
  const prevYM = shiftYearMonth(year, month, -1);
  const previous = monthlyTotals(transactions, prevYM.year, prevYM.month);
  const savingsContribution = monthlySavingsContribution(transactions, year, month);
  const prevSavingsContribution = monthlySavingsContribution(transactions, prevYM.year, prevYM.month);
  // Net change in savings this month — what "Saved this month" reads. A contribution that's
  // since been moved back out by transfer, or spent straight out of a savings wallet, comes
  // off it. 
  const netSavingsThisMonth =
    savingsContribution -
    monthlySavingsReversal(transactions, walletsWithDeleted, year, month) -
    monthlySavingsWithdrawal(transactions, walletsWithDeleted, year, month);
  const prevNetSavingsThisMonth =
    prevSavingsContribution -
    monthlySavingsReversal(transactions, walletsWithDeleted, prevYM.year, prevYM.month) -
    monthlySavingsWithdrawal(transactions, walletsWithDeleted, prevYM.year, prevYM.month);
  const categories = spendingBreakdown(transactions, year, month);
  const trend = incomeExpenseTrend(transactions, walletsWithDeleted, year, month, trendRange, locale);
  const budgetRows = budgetProgress(transactions, budgets, year, month, walletsWithDeleted);
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  const activeWallets = wallets.filter((w) => !w.archived);
  const savingsWallets = walletsByType(wallets, "savings");
  const debtWallets = walletsByType(wallets, "debt");
  const lendWallets = walletsByType(wallets, "lend");
  const walletPreview = activeWallets.slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">
            {t("welcomeBack", { name: user.name.split(" ")[0] })}
          </h2>
          <p className="text-[13px] text-text-muted">
            {t("lookingSoFar", { month: monthLabel(month, locale), year: formatYear(year, locale) })}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <ViewToggle view="month" />
          <MonthYearPicker year={year} month={month} className="w-full sm:w-auto" />
          <LinkButton href={`/statement?year=${year}&month=${month}`} variant="secondary" className="w-full sm:w-auto">
            <FileText className="h-4 w-4" strokeWidth={2} />
            {tStatement("statement")}
          </LinkButton>
          <AddTransactionButton wallets={activeWallets} label={tCommon("add")} className="w-full sm:w-auto" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ToggleStatCard
          icon={<WalletIcon className="h-4 w-4" strokeWidth={2} />}
          accent="brand"
          locale={locale}
          views={[
            {
              key: "all",
              toggle: t("toggleAll"),
              label: t("netWorth"),
              value: netWorth(wallets),
              hint: t("assetsMinusDebt"),
            },
            {
              key: "liquid",
              toggle: t("toggleExclSavingsLend"),
              label: t("netWorthExclSavingsLend"),
              value: totalLiquid(wallets),
              hint: t("cashAndBank"),
            },
          ]}
        />
        <StatCard
          label={t("expensesThisMonth")}
          value={current.expense}
          icon={TrendingDown}
          accent="critical"
          locale={locale}
          delta={pct(current.expense, previous.expense)}
          deltaGoodDirection="down"
        />
        <ToggleStatCard
          icon={<PiggyBank className="h-4 w-4" strokeWidth={2} />}
          accent="good"
          locale={locale}
          views={[
            {
              key: "total",
              toggle: t("toggleTotal"),
              label: t("totalSavings"),
              value: totalSavings(wallets),
              hint: tCommon("walletCount", { count: savingsWallets.length }),
            },
            {
              key: "this-month",
              toggle: t("toggleThisMonth"),
              label: t("savedThisMonth"),
              value: netSavingsThisMonth,
              delta: pct(netSavingsThisMonth, prevNetSavingsThisMonth),
              deltaGoodDirection: "up",
            },
          ]}
        />
        <ToggleStatCard
          icon={<CreditCard className="h-4 w-4" strokeWidth={2} />}
          accent="critical"
          locale={locale}
          views={[
            {
              key: "debt",
              toggle: t("toggleDebt"),
              label: t("totalDebt"),
              value: totalDebt(wallets),
              hint: tCommon("walletCount", { count: debtWallets.length }),
              icon: <CreditCard className="h-4 w-4" strokeWidth={2} />,
              accent: "critical",
            },
            {
              key: "lend",
              toggle: t("toggleLend"),
              label: t("totalLent"),
              value: totalLend(wallets),
              hint: tCommon("walletCount", { count: lendWallets.length }),
              icon: <HandCoins className="h-4 w-4" strokeWidth={2} />,
              accent: "good",
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">{tYear("chartTitle")}</h3>
            <TrendRangeSelect value={trendRange} />
          </div>
          <TrendChart data={trend} />
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">{t("spendingByCategory")}</h3>
            <span className="text-[12.5px] text-text-muted">
              {monthLabel(month, locale)} {formatYear(year, locale)}
            </span>
          </div>
          <CategoryBarChart data={categories} />
        </Card>
      </div>

      <div>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-text-primary">{t("budgetVsExpense")}</h3>
            <Link href="/budgets" className="text-[13px] font-medium text-brand hover:underline">
              {tCommon("viewAll")} →
            </Link>
          </div>
          <CreateBudgetButton label={t("addBudget")} budgets={budgets} defaultYear={year} defaultMonth={month} />
        </div>
        {budgetRows.length === 0 ? (
          <EmptyState
            icon={Target}
            title={t("noBudgetsTitle")}
            description={t("noBudgetsDesc")}
            action={<CreateBudgetButton label={t("createBudget")} budgets={budgets} defaultYear={year} defaultMonth={month} />}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="p-5 lg:col-span-3">
              <BudgetTable rows={budgetRows} budgets={budgets} showActions={false} />
            </Card>
            <Card className="p-5 lg:col-span-2">
              <BudgetProgressChart data={budgetRows} />
            </Card>
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">{t("yourWallets")}</h3>
          <Link href="/wallets" className="text-[13px] font-medium text-brand hover:underline">
            {tCommon("viewAll")} →
          </Link>
        </div>
        {walletPreview.length === 0 ? (
          <EmptyState icon={WalletIcon} title={t("noWalletsTitle")} description={t("noWalletsDesc")} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {walletPreview.map((w) => (
              <WalletCard key={w.id} wallet={w} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">{t("recentTransactions")}</h3>
          <Link href="/transactions" className="text-[13px] font-medium text-brand hover:underline">
            {tCommon("viewAll")} →
          </Link>
        </div>
        <TransactionTable transactions={recent} wallets={walletsWithDeleted} />
      </div>
    </div>
  );
}
