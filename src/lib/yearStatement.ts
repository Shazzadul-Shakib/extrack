import type { Transaction, Wallet } from "./types";
import { getUserTransactions, getUserWallets } from "./queries";
import { buildMonthlyStatement, type StatementWalletLine } from "./statement";
import { yearlyIncomeBreakdown, yearlySeries, yearlyTotals, type YearMonthPoint, type YearTotals } from "./yearly";

export interface YearlyExpenseRow {
  category: string;
  /** Index 0 = January. */
  months: number[];
  total: number;
}

export interface YearlyLoanSummary {
  opening: number;
  /** Debt: newly borrowed. Lend: newly lent. */
  increased: number;
  /** Debt: paid down. Lend: paid back to you. */
  decreased: number;
  closing: number;
}

export interface YearlyStatement {
  year: number;
  userName: string;
  summary: YearTotals & { liquidOpening: number; liquidClosing: number; transactionCount: number };
  months: YearMonthPoint[];
  expenseMatrix: YearlyExpenseRow[];
  incomeByCategory: { category: string; amount: number }[];
  debt: YearlyLoanSummary;
  lend: YearlyLoanSummary;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (lines: StatementWalletLine[], pick: (l: StatementWalletLine) => number) =>
  lines.reduce((s, l) => s + pick(l), 0);

/**
 * A compact year-in-review. Income, expense and savings reuse the dashboard's monthly rules; the
 * month-by-category matrix, balances and loan movement are rolled up from twelve monthly statements,
 * so every figure agrees with the monthly statement for the same period.
 */
export function buildYearlyStatement({
  userName,
  wallets,
  transactions,
  year,
}: {
  userName: string;
  wallets: Wallet[];
  transactions: Transaction[];
  year: number;
}): YearlyStatement {
  const months = yearlySeries(transactions, wallets, year);
  const statements = months.map((m) => buildMonthlyStatement({ userName, wallets, transactions, year, month: m.month }));

  const matrix = new Map<string, number[]>();
  statements.forEach((st, i) => {
    for (const c of st.expenses.byCategory) {
      const row = matrix.get(c.category) ?? new Array<number>(12).fill(0);
      row[i] += c.amount;
      matrix.set(c.category, row);
    }
  });
  const expenseMatrix = [...matrix.entries()]
    .map(([category, m]) => ({ category, months: m.map(round2), total: round2(m.reduce((s, n) => s + n, 0)) }))
    .sort((a, b) => b.total - a.total);

  function loan(type: "debt" | "lend"): YearlyLoanSummary {
    const lines = statements.flatMap((st) => st[type].wallets);
    // A wallet appears in each month it was active, so opening is its first line's opening and closing its last.
    const firstByWallet = new Map<string, StatementWalletLine>();
    const lastByWallet = new Map<string, StatementWalletLine>();
    for (const l of lines) {
      if (!firstByWallet.has(l.id)) firstByWallet.set(l.id, l);
      lastByWallet.set(l.id, l);
    }
    return {
      opening: round2(sum([...firstByWallet.values()], (l) => l.opening)),
      increased: round2(sum(lines, (l) => l.added)),
      decreased: round2(sum(lines, (l) => l.reduced)),
      closing: round2(sum([...lastByWallet.values()], (l) => l.closing)),
    };
  }

  const totals = yearlyTotals(months);
  return {
    year,
    userName,
    summary: {
      income: round2(totals.income),
      expense: round2(totals.expense),
      saved: round2(totals.saved),
      net: round2(totals.net),
      liquidOpening: statements[0].summary.liquidOpening,
      liquidClosing: statements[11].summary.liquidClosing,
      transactionCount: statements.reduce((s, st) => s + st.summary.transactionCount, 0),
    },
    months,
    expenseMatrix,
    incomeByCategory: yearlyIncomeBreakdown(transactions, year).map((c) => ({ ...c, amount: round2(c.amount) })),
    debt: loan("debt"),
    lend: loan("lend"),
  };
}

export async function getYearlyStatement(user: { id: string; name: string }, year: number) {
  const [wallets, transactions] = await Promise.all([
    getUserWallets(user.id, { includeDeleted: true }),
    getUserTransactions(user.id),
  ]);
  return buildYearlyStatement({ userName: user.name, wallets, transactions, year });
}
