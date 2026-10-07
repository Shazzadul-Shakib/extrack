import type { Transaction, Wallet } from "./types";
import {
  isIncome,
  isSpending,
  monthlySavingsContribution,
  monthlySavingsReversal,
  monthlySavingsWithdrawal,
  monthlyTotals,
  sumBy,
} from "./finance";

export interface YearMonthPoint {
  month: number;
  income: number;
  expense: number;
  /** Net change in savings that month — same rule as the dashboard's "Saved this month". */
  saved: number;
  net: number;
}

export interface YearTotals {
  income: number;
  expense: number;
  saved: number;
  net: number;
}

/** One entry per calendar month of `year`, built from the same helpers the monthly dashboard uses. */
export function yearlySeries(transactions: Transaction[], wallets: Wallet[], year: number): YearMonthPoint[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const totals = monthlyTotals(transactions, year, month);
    const saved =
      monthlySavingsContribution(transactions, year, month) -
      monthlySavingsReversal(transactions, wallets, year, month) -
      monthlySavingsWithdrawal(transactions, wallets, year, month);
    return { month, income: totals.income, expense: totals.expense, saved, net: totals.net };
  });
}

export function yearlyTotals(points: YearMonthPoint[]): YearTotals {
  const income = sumBy(points, (p) => p.income);
  const expense = sumBy(points, (p) => p.expense);
  return { income, expense, saved: sumBy(points, (p) => p.saved), net: income - expense };
}

export function yearlySpendingBreakdown(transactions: Transaction[], year: number): { category: string; amount: number }[] {
  const byCategory = new Map<string, number>();
  for (const t of transactions) {
    if (!t.date.startsWith(`${year}-`) || !isSpending(t)) continue;
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }
  return [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function yearlyIncomeBreakdown(transactions: Transaction[], year: number): { category: string; amount: number }[] {
  const byCategory = new Map<string, number>();
  for (const t of transactions) {
    if (!t.date.startsWith(`${year}-`) || !isIncome(t)) continue;
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }
  return [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
