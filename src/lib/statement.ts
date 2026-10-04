import type { Transaction, Wallet, WalletType } from "./types";
import { getUserTransactions, getUserWallets } from "./queries";
import { isInMonth, isIncome, isSpending, monthlyTotals, walletDelta } from "./finance";
import { SAVINGS_CATEGORY } from "./categories";

/** A dated income / expense / transfer line, with wallet ids already resolved to names. */
export interface StatementRow {
  id: string;
  date: string;
  category: string;
  walletName: string;
  /** Destination wallet of a transfer (e.g. the debt being paid), else null. */
  toWalletName: string | null;
  note: string;
  amount: number;
}

export interface StatementCategoryTotal {
  category: string;
  amount: number;
  /** Share of the section's total, 0–100. */
  share: number;
}

/**
 * One wallet's line in a statement table. `added`/`reduced` are in the wallet's own balance terms:
 * for cash/bank/savings that's money in / money out, for a debt wallet it's owed going up / down,
 * for a lend wallet it's lent going up / repaid.
 */
export interface StatementWalletLine {
  id: string;
  name: string;
  type: WalletType;
  opening: number;
  added: number;
  reduced: number;
  closing: number;
}

/** A movement on a debt or lend wallet. "increase" = more owed / more lent, "decrease" = paid down / paid back. */
export interface StatementMovement {
  id: string;
  date: string;
  walletName: string;
  /** The wallet on the other side of a transfer, if any. */
  counterpartName: string | null;
  direction: "increase" | "decrease";
  category: string;
  note: string;
  amount: number;
}

export interface StatementLoanSection {
  wallets: StatementWalletLine[];
  movements: StatementMovement[];
  /** Total outstanding at month end across the wallets above. */
  outstanding: number;
}

export interface MonthlyStatement {
  year: number;
  month: number;
  userName: string;
  currency: string;
  summary: {
    income: number;
    expense: number;
    net: number;
    /** Cash + bank balances at the start / end of the month. */
    liquidOpening: number;
    liquidClosing: number;
    transactionCount: number;
  };
  income: { rows: StatementRow[]; byCategory: StatementCategoryTotal[]; total: number };
  expenses: { rows: StatementRow[]; byCategory: StatementCategoryTotal[]; total: number };
  lend: StatementLoanSection;
  debt: StatementLoanSection;
  /** Transfers between the user's own wallets (savings, plain transfers) — neither income nor expense. */
  transfers: { rows: StatementRow[]; savingsMoved: number };
  /** Every wallet that was active in the month (plus any debt/lend wallet still carrying a balance). */
  wallets: StatementWalletLine[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** How a transaction moves each wallet it touches — the same rules `applyEffect` uses to move real balances. */
function effects(t: Transaction, walletsById: Map<string, Wallet>): { walletId: string; delta: number }[] {
  const from = walletsById.get(t.walletId);
  if (t.kind === "transfer") {
    const to = t.toWalletId ? walletsById.get(t.toWalletId) : undefined;
    const out: { walletId: string; delta: number }[] = [];
    if (from) out.push({ walletId: from.id, delta: walletDelta(from.type, "expense", t.amount) });
    if (to) out.push({ walletId: to.id, delta: walletDelta(to.type, "income", t.amount) });
    return out;
  }
  return from ? [{ walletId: from.id, delta: walletDelta(from.type, t.kind, t.amount) }] : [];
}

function byDateAsc(a: Transaction, b: Transaction): number {
  return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
}

function categoryTotals(rows: { category: string; amount: number }[], total: number): StatementCategoryTotal[] {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.category, (map.get(r.category) ?? 0) + r.amount);
  return [...map.entries()]
    .map(([category, amount]) => ({
      category,
      amount: round2(amount),
      share: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Builds one calendar month's statement from a user's complete wallet and transaction history.
 *
 * Income and expense come from the shared `monthlyTotals` / `isSpending` rules, so the statement
 * always agrees with the dashboard. A wallet only stores its *current* balance, so opening and
 * closing balances are worked out backwards: closing = current balance minus the effect of every
 * later transaction, opening = closing minus the month's own effect.
 */
export function buildMonthlyStatement({
  userName,
  wallets,
  transactions,
  year,
  month,
}: {
  userName: string;
  wallets: Wallet[];
  transactions: Transaction[];
  year: number;
  month: number;
}): MonthlyStatement {
  const ym = monthKey(year, month);
  const walletsById = new Map(wallets.map((w) => [w.id, w]));
  const nameOf = (id: string | null) => (id ? (walletsById.get(id)?.name ?? "—") : null);
  const typeOf = (id: string | null) => (id ? walletsById.get(id)?.type : undefined);

  const inMonth = transactions.filter((t) => isInMonth(t.date, year, month)).sort(byDateAsc);
  const afterMonth = transactions.filter((t) => t.date.slice(0, 7) > ym);

  // Per-wallet movement during the month, and everything that happened after it.
  const monthAdded = new Map<string, number>();
  const monthReduced = new Map<string, number>();
  const monthNet = new Map<string, number>();
  const activeIds = new Set<string>();
  for (const t of inMonth) {
    for (const { walletId, delta } of effects(t, walletsById)) {
      activeIds.add(walletId);
      monthNet.set(walletId, (monthNet.get(walletId) ?? 0) + delta);
      const bucket = delta >= 0 ? monthAdded : monthReduced;
      bucket.set(walletId, (bucket.get(walletId) ?? 0) + Math.abs(delta));
    }
  }
  const laterNet = new Map<string, number>();
  for (const t of afterMonth) {
    for (const { walletId, delta } of effects(t, walletsById)) {
      laterNet.set(walletId, (laterNet.get(walletId) ?? 0) + delta);
    }
  }

  function lineFor(w: Wallet): StatementWalletLine {
    const closing = w.balance - (laterNet.get(w.id) ?? 0);
    const opening = closing - (monthNet.get(w.id) ?? 0);
    return {
      id: w.id,
      name: w.name,
      type: w.type,
      opening: round2(opening),
      added: round2(monthAdded.get(w.id) ?? 0),
      reduced: round2(monthReduced.get(w.id) ?? 0),
      closing: round2(closing),
    };
  }

  // A wallet created after this month didn't exist yet — leave it out of this month's statement
  // (unless a backdated transaction touched it).
  const existing = wallets.filter((w) => w.createdAt.slice(0, 7) <= ym || activeIds.has(w.id));
  const lines = existing.map(lineFor);
  const isLoan = (type: WalletType) => type === "debt" || type === "lend";

  // Active this month, or a debt/lend wallet that still carried a balance at month end.
  const statementLines = lines.filter((l) => activeIds.has(l.id) || (isLoan(l.type) && l.closing !== 0));

  const liquid = lines.filter((l) => l.type === "cash" || l.type === "bank");

  const toRow = (t: Transaction): StatementRow => ({
    id: t.id,
    date: t.date,
    category: t.category,
    walletName: nameOf(t.walletId) ?? "—",
    toWalletName: nameOf(t.toWalletId),
    note: t.note,
    amount: t.amount,
  });

  const totals = monthlyTotals(transactions, year, month);
  const incomeRows = inMonth.filter(isIncome).map(toRow);
  const expenseRows = inMonth.filter(isSpending).map(toRow);

  function loanSection(type: "debt" | "lend"): StatementLoanSection {
    const sectionLines = statementLines.filter((l) => l.type === type);
    const ids = new Set(sectionLines.map((l) => l.id));
    const movements: StatementMovement[] = [];
    for (const t of inMonth) {
      for (const { walletId, delta } of effects(t, walletsById)) {
        if (!ids.has(walletId) || delta === 0) continue;
        const counterpart = t.walletId === walletId ? t.toWalletId : t.walletId;
        movements.push({
          id: `${t.id}:${walletId}`,
          date: t.date,
          walletName: nameOf(walletId) ?? "—",
          counterpartName: t.kind === "transfer" ? nameOf(counterpart) : null,
          direction: delta > 0 ? "increase" : "decrease",
          category: t.category,
          note: t.note,
          amount: t.amount,
        });
      }
    }
    return {
      wallets: sectionLines,
      movements,
      outstanding: round2(sectionLines.reduce((sum, l) => sum + l.closing, 0)),
    };
  }

  // Transfers that don't touch a debt or lend wallet stay between the user's own wallets.
  const transferRows = inMonth
    .filter((t) => t.kind === "transfer" && !isLoan(typeOf(t.walletId) ?? "cash") && !isLoan(typeOf(t.toWalletId) ?? "cash"))
    .map(toRow);

  const sumRows = (rows: StatementRow[]) => round2(rows.reduce((s, r) => s + r.amount, 0));

  return {
    year,
    month,
    userName,
    currency: wallets[0]?.currency ?? "BDT",
    summary: {
      income: round2(totals.income),
      expense: round2(totals.expense),
      net: round2(totals.net),
      liquidOpening: round2(liquid.reduce((s, l) => s + l.opening, 0)),
      liquidClosing: round2(liquid.reduce((s, l) => s + l.closing, 0)),
      transactionCount: inMonth.length,
    },
    income: { rows: incomeRows, byCategory: categoryTotals(incomeRows, sumRows(incomeRows)), total: sumRows(incomeRows) },
    expenses: {
      rows: expenseRows,
      byCategory: categoryTotals(expenseRows, sumRows(expenseRows)),
      total: sumRows(expenseRows),
    },
    lend: loanSection("lend"),
    debt: loanSection("debt"),
    transfers: { rows: transferRows, savingsMoved: sumRows(transferRows.filter((r) => r.category === SAVINGS_CATEGORY)) },
    wallets: statementLines,
  };
}

/** Loads a user's data and builds the statement for `year`/`month`. */
export async function getMonthlyStatement(user: { id: string; name: string }, year: number, month: number) {
  const [wallets, transactions] = await Promise.all([
    getUserWallets(user.id, { includeDeleted: true }),
    getUserTransactions(user.id),
  ]);
  return buildMonthlyStatement({ userName: user.name, wallets, transactions, year, month });
}
