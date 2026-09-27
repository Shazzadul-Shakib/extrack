import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CreditCard, HandCoins, PiggyBank, Target, TrendingDown, Wallet as WalletIcon } from "lucide-react";
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
  walletsByType,
  budgetProgress,
  type TrendRange,
} from "@/lib/finance";
import { currentYearMonth, shiftYearMonth, monthLabel, formatNumber } from "@/lib/format";
import { ToggleStatCard } from "@/components/dashboard/ToggleStatCard";
import { CategoryBarChart } from "@/components/dashboard/CategoryBarChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { TrendRangeSelect } from "@/components/dashboard/TrendRangeSelect";
import { MonthYearPicker } from "@/components/dashboard/MonthYearPicker";
import { AddTransactionButton } from "@/components/transactions/AddTransactionButton";
import { WalletCard } from "@/components/wallets/WalletCard";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { BudgetTable } from "@/components/budgets/BudgetTable";
import { BudgetProgressChart } from "@/components/budgets/BudgetProgressChart";
import { CreateBudgetButton } from "@/components/budgets/CreateBudgetButton";
import { Card, EmptyState } from "@/components/ui";

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
  const [t, tCommon, locale] = await Promise.all([
    getTranslations("Dashboard"),
    getTranslations("Common"),
    getLocale(),
  ]);
  const params = await searchParams;
  const defaults = currentYearMonth();
  const year = Number(params.year) || defaults.year;
  const month = Number(params.month) || defaults.month;
  const rawTrendRange = Array.isArray(params.trend) ? params.trend[0] : params.trend;
  const trendRange: TrendRange = TREND_RANGES.includes(rawTrendRange as TrendRange)
    ? (rawTrendRange as TrendRange)
    : "6-months";

  const [walletsWithDeleted, transactions, budgets] = await Promise.all([
    getUserWallets(user.id, { includeDeleted: true }),
    getUserTransactions(user.id),
    getUserBudgets(user.id),
  ]);
  // Soft-deleted wallets are kept only to resolve names for historical
  // transactions in the "Recent" list — never for totals, pickers, or previews.
  const wallets = walletsWithDeleted.filter((w) => !w.deletedAt);

  const current = monthlyTotals(transactions, year, month);
  const prevYM = shiftYearMonth(year, month, -1);
  const previous = monthlyTotals(transactions, prevYM.year, prevYM.month);
  // Money moved into savings this month — used to back the internal transfer out of
  // "Expenses excl. savings" below. `monthlyTotals().expense` only ever adds this exact
  // gross figure for a savings transfer (never anything for a later reversal, which isn't
  // spending and isn't added there either), so backing it out has to subtract the same
  // gross figure — netting it against the reversal here would leave the reversed amount
  // stranded in "Expenses excl. savings" as phantom spending even though no money actually
  // left the wallets.
  const savingsContribution = monthlySavingsContribution(transactions, year, month);
  const prevSavingsContribution = monthlySavingsContribution(transactions, prevYM.year, prevYM.month);
  // How much of this month's contribution didn't stay put — moved back out by transfer, or
  // spent straight out of a savings wallet. Both bring money that once counted as "moved to
  // savings" back into play, so both come off the gross contribution above for anything that
  // should track the *current* savings position rather than the moment-of-transfer snapshot.
  const savingsReversal = monthlySavingsReversal(transactions, walletsWithDeleted, year, month);
  const savingsWithdrawal = monthlySavingsWithdrawal(transactions, walletsWithDeleted, year, month);
  const prevSavingsReversal = monthlySavingsReversal(transactions, walletsWithDeleted, prevYM.year, prevYM.month);
  const prevSavingsWithdrawal = monthlySavingsWithdrawal(transactions, walletsWithDeleted, prevYM.year, prevYM.month);
  // Net change in savings this month — what "Saved this month" should read, so it drops back
  // down the moment savings gets spent or un-contributed instead of holding onto the original
  // contribution.
  const netSavingsThisMonth = savingsContribution - savingsReversal - savingsWithdrawal;
  const prevNetSavingsThisMonth = prevSavingsContribution - prevSavingsReversal - prevSavingsWithdrawal;
  // "Expenses this month" is meant to read as the mirror of "Saved this month": real spending
  // plus whatever's still parked in savings, so toggling between the two expense views always
  // moves by exactly the Savings card's own number. A contribution that's since been reversed
  // or spent out of savings no longer belongs in that "still parked" amount — it already shows
  // up as its own line under "Excl. savings" — so it comes off here the same way.
  const expensesThisMonth = current.expense - savingsReversal - savingsWithdrawal;
  const prevExpensesThisMonth = previous.expense - prevSavingsReversal - prevSavingsWithdrawal;
  const categories = spendingBreakdown(transactions, walletsWithDeleted, year, month);
  const trend = incomeExpenseTrend(transactions, year, month, trendRange, locale);
  const budgetRows = budgetProgress(transactions, budgets, walletsWithDeleted, year, month);
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
            {t("lookingSoFar", { month: monthLabel(month, locale), year: formatNumber(year, locale) })}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <MonthYearPicker year={year} month={month} className="w-full sm:w-auto" />
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
              key: "excl-savings",
              toggle: t("toggleExclSavings"),
              label: t("netWorthExclSavings"),
              value: netWorth(wallets) - totalSavings(wallets),
              hint: t("cashAndBankMinusDebt"),
            },
          ]}
        />
        <ToggleStatCard
          icon={<TrendingDown className="h-4 w-4" strokeWidth={2} />}
          accent="critical"
          locale={locale}
          views={[
            {
              key: "all",
              toggle: t("toggleAll"),
              label: t("expensesThisMonth"),
              value: expensesThisMonth,
              delta: pct(expensesThisMonth, prevExpensesThisMonth),
              deltaGoodDirection: "down",
            },
            {
              key: "excl-savings",
              toggle: t("toggleExclSavings"),
              label: t("expensesExclSavings"),
              value: current.expense - savingsContribution,
              delta: pct(current.expense - savingsContribution, previous.expense - prevSavingsContribution),
              deltaGoodDirection: "down",
            },
          ]}
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
            <h3 className="text-sm font-semibold text-text-primary">{t("incomeVsExpense")}</h3>
            <TrendRangeSelect value={trendRange} />
          </div>
          <TrendChart data={trend} />
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">{t("spendingByCategory")}</h3>
            <span className="text-[12.5px] text-text-muted">
              {monthLabel(month, locale)} {formatNumber(year, locale)}
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
