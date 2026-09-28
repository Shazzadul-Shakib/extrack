import type { Budget, Transaction, Wallet, WalletType } from "./types";
import { formatDate, formatDateShort, formatYear, monthLabel, monthLabelShort, shiftYearMonth, todayIso } from "./format";
import { DEBT_CATEGORY, SAVINGS_CATEGORY, LEND_CATEGORY } from "./categories";

/**
 * How a transaction of `kind` moves a wallet's balance.
 *
 * For asset wallets (cash/bank/savings) balance is money on hand: expenses
 * subtract, income adds. For a debt wallet, balance means "amount owed", so
 * the sign flips: spending on a debt wallet (e.g. a credit card) increases
 * what's owed, and income into it (a repayment) reduces it. A transfer is
 * just an expense-effect on the source wallet plus an income-effect on the
 * destination wallet, which is what makes "pay off a debt" or "move money
 * into savings" fall out of the same two rules.
 */
export function walletDelta(walletType: WalletType, kind: "expense" | "income", amount: number): number {
  const isDebtWallet = walletType === "debt";
  if (kind === "expense") return isDebtWallet ? amount : -amount;
  return isDebtWallet ? -amount : amount;
}

export function isInMonth(dateIso: string, year: number, month: number): boolean {
  const [y, m] = dateIso.split("-").map(Number);
  return y === year && m === month;
}

export function sumBy<T>(items: T[], fn: (item: T) => number): number {
  return items.reduce((total, item) => total + fn(item), 0);
}

/**
 * The transfer categories that count as money spent: paying off a debt, funding a savings
 * wallet, or lending money out. They're modeled as transfers (a wallet balance has to move),
 * but the user spends this money in the month it goes out, so it's spending everywhere.
 */
export const SPENDING_TRANSFER_CATEGORIES: string[] = [DEBT_CATEGORY, SAVINGS_CATEGORY, LEND_CATEGORY];

/**
 * THE definition of "an expense" — the single source of truth every total in the app is
 * built on (dashboard cards, trend chart, category breakdown, budgets, the Transactions
 * page's summary and month comparison). A plain expense, or a transfer earmarked as a debt
 * payoff, savings contribution, or money lent out.
 *
 * Anything that totals spending must go through this (or `totalSpending`, or `spendingWhere`
 * for the database) instead of filtering on `kind === "expense"` on its own — a second copy
 * of the rule is exactly how two screens end up showing different numbers.
 */
export function isSpending(t: Pick<Transaction, "kind" | "category">): boolean {
  return t.kind === "expense" || (t.kind === "transfer" && SPENDING_TRANSFER_CATEGORIES.includes(t.category));
}

/** Total spending across `transactions` — sums every row `isSpending` accepts. */
export function totalSpending(transactions: Pick<Transaction, "kind" | "category" | "amount">[]): number {
  return sumBy(transactions.filter(isSpending), (t) => t.amount);
}

/**
 * `isSpending` as a database filter (a Prisma `where` fragment), for totals and lists that are
 * computed in SQL rather than in memory. Must stay the exact mirror of `isSpending` above.
 */
export function spendingWhere() {
  return {
    OR: [{ kind: "expense" as const }, { kind: "transfer" as const, category: { in: SPENDING_TRANSFER_CATEGORIES } }],
  };
}

export function monthlyTotals(transactions: Transaction[], year: number, month: number) {
  const inMonth = transactions.filter((t) => isInMonth(t.date, year, month));
  const expense = totalSpending(inMonth);
  const income = sumBy(
    inMonth.filter((t) => t.kind === "income"),
    (t) => t.amount
  );
  return { expense, income, net: income - expense, count: inMonth.length };
}

/**
 * Money moved into savings wallets during a calendar month — the savings-tagged
 * transfers that `monthlyTotals().expense` also counts as spending. Subtract it
 * from that total to get "expenses without savings"; on its own it's the
 * month's savings contribution.
 */
export function monthlySavingsContribution(transactions: Transaction[], year: number, month: number): number {
  return sumBy(
    transactions.filter(
      (t) => isInMonth(t.date, year, month) && t.kind === "transfer" && t.category === SAVINGS_CATEGORY
    ),
    (t) => t.amount
  );
}

/**
 * Money taken back out of savings wallets during a calendar month — a plain expense
 * (not a transfer) sourced directly from a wallet of type "savings", e.g. paying for
 * something straight out of a savings account. `monthlySavingsContribution` only
 * tracks money moving *in*, so it stays exactly what "expenses without savings" needs
 * to subtract; this is the other half, for callers that want the month's *net* change
 * in savings (contribution minus withdrawal) — see "Saved this month" on the dashboard.
 * Only feeds that savings figure: the withdrawal is still a real expense, so it is never
 * taken back out of any spending total.
 */
export function monthlySavingsWithdrawal(transactions: Transaction[], wallets: Wallet[], year: number, month: number): number {
  const savingsWalletIds = new Set(wallets.filter((w) => w.type === "savings").map((w) => w.id));
  return sumBy(
    transactions.filter(
      (t) => isInMonth(t.date, year, month) && t.kind === "expense" && savingsWalletIds.has(t.walletId)
    ),
    (t) => t.amount
  );
}

/**
 * Money moved *back out* of a savings wallet into a non-savings wallet by transfer during
 * a calendar month — e.g. pulling part of a contribution back into checking without
 * spending it. Unlike `monthlySavingsWithdrawal` this isn't spending (it never leaves the
 * user's own wallets), so it nets against `monthlySavingsContribution` when working out
 * "Saved this month": money that came right back out was never really relocated to savings.
 * Like the withdrawal above, it only feeds that savings figure, never a spending total.
 */
export function monthlySavingsReversal(transactions: Transaction[], wallets: Wallet[], year: number, month: number): number {
  const savingsWalletIds = new Set(wallets.filter((w) => w.type === "savings").map((w) => w.id));
  return sumBy(
    transactions.filter(
      (t) =>
        isInMonth(t.date, year, month) &&
        t.kind === "transfer" &&
        savingsWalletIds.has(t.walletId) &&
        !!t.toWalletId &&
        !savingsWalletIds.has(t.toWalletId)
    ),
    (t) => t.amount
  );
}

function groupByCategory(transactions: Transaction[]): { category: string; amount: number }[] {
  const byCategory = new Map<string, number>();
  for (const t of transactions) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }
  return [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Spending by category for the month — the per-category split of exactly the total
 * `monthlyTotals().expense` reports, so the bars always add up to the headline number.
 */
export function spendingBreakdown(
  transactions: Transaction[],
  year: number,
  month: number
): { category: string; amount: number }[] {
  return groupByCategory(transactions.filter((t) => isInMonth(t.date, year, month) && isSpending(t)));
}

export function monthlyTrend(transactions: Transaction[], year: number, month: number, monthsBack = 6) {
  const points: { year: number; month: number; income: number; expense: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const { year: y, month: m } = shiftYearMonth(year, month, -i);
    const totals = monthlyTotals(transactions, y, m);
    points.push({ year: y, month: m, income: totals.income, expense: totals.expense });
  }
  return points;
}

/** Selectable windows for the dashboard's income/expense trend chart. */
export type TrendRange = "week" | "month" | "last-month" | "6-months";

export interface TrendPoint {
  /** Stable React key — a date for daily points, "year-month" for monthly ones. */
  key: string;
  /** Short x-axis tick, e.g. "Sep 5" or "Sep". */
  label: string;
  /** Full label for the hover card, e.g. "Sep 5, 2026" or "September 2026". */
  fullLabel: string;
  income: number;
  expense: number;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function addDays(dateIso: string, delta: number): string {
  const d = new Date(dateIso + "T00:00:00");
  d.setDate(d.getDate() + delta);
  // Rebuild from local date parts rather than toISOString(), which reads back in UTC and
  // shifts the date by a day in any timezone ahead of it — enough to wedge this in a loop.
  return isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function dailyTotals(transactions: Transaction[], dateIso: string): { income: number; expense: number } {
  const inDay = transactions.filter((t) => t.date === dateIso);
  return {
    expense: totalSpending(inDay),
    income: sumBy(
      inDay.filter((t) => t.kind === "income"),
      (t) => t.amount
    ),
  };
}

function dailyTrendPoints(transactions: Transaction[], startIso: string, endIso: string, locale: string): TrendPoint[] {
  const points: TrendPoint[] = [];
  let cur = startIso;
  let guard = 0;
  while (cur <= endIso && guard < 370) {
    const totals = dailyTotals(transactions, cur);
    points.push({
      key: cur,
      label: formatDateShort(cur, locale),
      fullLabel: formatDate(cur, locale),
      income: totals.income,
      expense: totals.expense,
    });
    cur = addDays(cur, 1);
    guard++;
  }
  return points;
}

/**
 * The daily start/end for the "week" / "month" / "last month" trend ranges — anchored to the
 * dashboard's selected month, but capped at today so a month still in progress doesn't trail
 * off into a flat line of future zeros.
 */
function trendWindow(year: number, month: number, range: "week" | "month" | "last-month"): { start: string; end: string } {
  const today = todayIso();
  const monthEnd = isoDate(year, month, daysInMonth(year, month));
  const anchor = monthEnd < today ? monthEnd : today;

  if (range === "month") {
    const start = isoDate(year, month, 1);
    return { start, end: anchor > start ? anchor : start };
  }
  if (range === "last-month") {
    const prev = shiftYearMonth(year, month, -1);
    const start = isoDate(prev.year, prev.month, 1);
    const prevEnd = isoDate(prev.year, prev.month, daysInMonth(prev.year, prev.month));
    const end = prevEnd < today ? prevEnd : today;
    return { start, end: end > start ? end : start };
  }
  // "week": trailing 7 days ending at the anchor.
  return { start: addDays(anchor, -6), end: anchor };
}

/**
 * Builds the dashboard's income/expense trend for the selected range, anchored to `year`/`month`
 * (the page's selected month) — "week"/"month"/"last month" break it down by day, "6-months"
 * keeps the original monthly view.
 */
export function incomeExpenseTrend(
  transactions: Transaction[],
  year: number,
  month: number,
  range: TrendRange,
  locale = "en",
): TrendPoint[] {
  if (range === "6-months") {
    return monthlyTrend(transactions, year, month, 6).map((p) => ({
      key: `${p.year}-${p.month}`,
      label: monthLabelShort(p.month, locale),
      fullLabel: `${monthLabel(p.month, locale)} ${formatYear(p.year, locale)}`,
      income: p.income,
      expense: p.expense,
    }));
  }
  const { start, end } = trendWindow(year, month, range);
  return dailyTrendPoints(transactions, start, end, locale);
}

export function walletsByType(wallets: Wallet[], type: WalletType): Wallet[] {
  return wallets.filter((w) => w.type === type && !w.archived);
}

export function totalAssets(wallets: Wallet[]): number {
  return sumBy(
    wallets.filter((w) => w.type !== "debt" && !w.archived),
    (w) => w.balance
  );
}

export function totalDebt(wallets: Wallet[]): number {
  return sumBy(
    wallets.filter((w) => w.type === "debt" && !w.archived),
    (w) => w.balance
  );
}

export function totalSavings(wallets: Wallet[]): number {
  return sumBy(
    wallets.filter((w) => w.type === "savings" && !w.archived),
    (w) => w.balance
  );
}

/** Money lent out to others and not yet paid back — a receivable, counted as an asset in net worth. */
export function totalLend(wallets: Wallet[]): number {
  return sumBy(
    wallets.filter((w) => w.type === "lend" && !w.archived),
    (w) => w.balance
  );
}

export function netWorth(wallets: Wallet[]): number {
  return totalAssets(wallets) - totalDebt(wallets);
}

export function budgetsForMonth(budgets: Budget[], year: number, month: number): Budget[] {
  return budgets.filter((b) => b.year === year && b.month === month);
}

export interface BudgetProgress {
  budgetId: string;
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  /** Spent as a percentage of budgeted, uncapped — a value over 100 means the category is over budget. */
  pct: number;
}

/**
 * Compares each of a month's budgets against actual spend in that category — reuses
 * `spendingBreakdown` so a budget on "Debt", "Savings" or "Lend" lines up with the same
 * transfer-as-spending rule used everywhere else spending is totaled.
 */
export function budgetProgress(
  transactions: Transaction[],
  budgets: Budget[],
  year: number,
  month: number
): BudgetProgress[] {
  const monthBudgets = budgetsForMonth(budgets, year, month);
  const spendByCategory = new Map(spendingBreakdown(transactions, year, month).map((c) => [c.category, c.amount]));

  return monthBudgets
    .map((b) => {
      const spent = spendByCategory.get(b.category) ?? 0;
      return {
        budgetId: b.id,
        category: b.category,
        budgeted: b.amount,
        spent,
        remaining: b.amount - spent,
        pct: b.amount > 0 ? (spent / b.amount) * 100 : spent > 0 ? 100 : 0,
      };
    })
    .sort((a, b) => b.budgeted - a.budgeted);
}

export function budgetTotals(rows: BudgetProgress[]): { budgeted: number; spent: number } {
  return { budgeted: sumBy(rows, (r) => r.budgeted), spent: sumBy(rows, (r) => r.spent) };
}

export interface BudgetComparisonRow {
  category: string;
  /** This category's progress in the base month, or null when it wasn't budgeted then. */
  base: BudgetProgress | null;
  /** This category's progress in the month being compared against, or null when it wasn't budgeted then. */
  compare: BudgetProgress | null;
  /** base.budgeted − compare.budgeted (a missing side counts as 0). */
  budgetedDelta: number;
  /** base.spent − compare.spent (a missing side counts as 0). */
  spentDelta: number;
}

/**
 * Lines up two months' budget rows by category so the page can show them side by
 * side. A category appears on a row when either month budgeted for it; the other
 * side is null. Rows are ordered by the larger of the two budgeted amounts.
 */
export function compareBudgetProgress(base: BudgetProgress[], compare: BudgetProgress[]): BudgetComparisonRow[] {
  const byCategory = new Map<string, { base: BudgetProgress | null; compare: BudgetProgress | null }>();
  for (const row of base) byCategory.set(row.category, { base: row, compare: null });
  for (const row of compare) {
    const entry = byCategory.get(row.category);
    if (entry) entry.compare = row;
    else byCategory.set(row.category, { base: null, compare: row });
  }

  return [...byCategory.entries()]
    .map(([category, { base: b, compare: c }]) => ({
      category,
      base: b,
      compare: c,
      budgetedDelta: (b?.budgeted ?? 0) - (c?.budgeted ?? 0),
      spentDelta: (b?.spent ?? 0) - (c?.spent ?? 0),
    }))
    .sort((a, b) => {
      const aMax = Math.max(a.base?.budgeted ?? 0, a.compare?.budgeted ?? 0);
      const bMax = Math.max(b.base?.budgeted ?? 0, b.compare?.budgeted ?? 0);
      return bMax - aMax;
    });
}

export interface CategoryComparisonRow {
  category: string;
  baseAmount: number;
  compareAmount: number;
  /** baseAmount − compareAmount (a missing side counts as 0). */
  delta: number;
}

/**
 * Lines up two months' category totals (e.g. a spending breakdown from `spendingBreakdown`)
 * by category for a side-by-side comparison — the transactions-page counterpart to
 * `compareBudgetProgress`, for plain totals rather than budget progress. A category appears
 * on a row when either month has an amount for it; the other side is 0. Rows are ordered by
 * the larger of the two amounts.
 */
export function compareCategoryTotals(
  base: { category: string; amount: number }[],
  compare: { category: string; amount: number }[]
): CategoryComparisonRow[] {
  const byCategory = new Map<string, { base: number; compare: number }>();
  for (const row of base) byCategory.set(row.category, { base: row.amount, compare: 0 });
  for (const row of compare) {
    const entry = byCategory.get(row.category);
    if (entry) entry.compare = row.amount;
    else byCategory.set(row.category, { base: 0, compare: row.amount });
  }

  return [...byCategory.entries()]
    .map(([category, { base: b, compare: c }]) => ({ category, baseAmount: b, compareAmount: c, delta: b - c }))
    .sort((a, b) => Math.max(b.baseAmount, b.compareAmount) - Math.max(a.baseAmount, a.compareAmount));
}
