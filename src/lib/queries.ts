import type { Prisma, LlmProvider } from "@prisma/client";
import { prisma } from "./db";
import type { Budget, Transaction, Wallet } from "./types";
import type { TransactionFilters } from "./transactionFilters";
import { SPENDING_TRANSFER_CATEGORIES, isSpending, spendingWhere } from "./finance";

type WalletRow = Awaited<ReturnType<typeof prisma.wallet.findFirstOrThrow>>;
type TransactionRow = Awaited<ReturnType<typeof prisma.transaction.findFirstOrThrow>>;
type BudgetRow = Awaited<ReturnType<typeof prisma.budget.findFirstOrThrow>>;

function mapWallet(row: WalletRow): Wallet {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    type: row.type,
    balance: Number(row.balance),
    currency: row.currency,
    note: row.note,
    archived: row.archived,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.userId,
    walletId: row.walletId,
    toWalletId: row.toWalletId,
    kind: row.kind,
    category: row.category,
    amount: Number(row.amount),
    date: row.date.toISOString().slice(0, 10),
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    userId: row.userId,
    category: row.category,
    amount: Number(row.amount),
    year: row.year,
    month: row.month,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface UserSettingsView {
  llmProvider: LlmProvider | null;
  hasAnthropicKey: boolean;
  hasOpenaiKey: boolean;
  hasGoogleKey: boolean;
  updatedAt: string | null;
}

/** The client-safe view of a user's LLM settings — the (encrypted or decrypted) API key itself
 *  never crosses into this shape, only whether one is stored. */
export async function getUserSettings(userId: string): Promise<UserSettingsView> {
  const row = await prisma.userSettings.findUnique({ where: { userId } });
  return {
    llmProvider: row?.llmProvider ?? null,
    hasAnthropicKey: !!row?.anthropicKeyEnc,
    hasOpenaiKey: !!row?.openaiKeyEnc,
    hasGoogleKey: !!row?.googleKeyEnc,
    updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

export async function getUserBudgets(userId: string): Promise<Budget[]> {
  const rows = await prisma.budget.findMany({
    where: { userId },
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "asc" }],
  });
  return rows.map(mapBudget);
}

/**
 * A user's wallets, oldest first. Soft-deleted wallets are excluded unless
 * `includeDeleted` is set — pass it only where a wallet name still has to be
 * resolved for historical transactions (the global Transactions ledger and the
 * dashboard's recent list), never for pickers or totals.
 */
export async function getUserWallets(
  userId: string,
  { includeDeleted = false }: { includeDeleted?: boolean } = {}
): Promise<Wallet[]> {
  const rows = await prisma.wallet.findMany({
    where: { userId, ...(includeDeleted ? {} : { deletedAt: null }) },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapWallet);
}

export async function getWallet(userId: string, walletId: string): Promise<Wallet | null> {
  const row = await prisma.wallet.findFirst({ where: { id: walletId, userId, deletedAt: null } });
  return row ? mapWallet(row) : null;
}

export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  const rows = await prisma.transaction.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(mapTransaction);
}

/** Restricts a transaction query to rows that touch one of a set of wallets, as source or destination. */
export interface TransactionScope {
  walletIds: string[];
}

export const TRANSACTIONS_PAGE_SIZE = 20;

export interface TransactionsPage {
  items: Transaction[];
  hasMore: boolean;
}

function transactionWhere(
  userId: string,
  filters: TransactionFilters,
  scope?: TransactionScope
): Prisma.TransactionWhereInput {
  const and: Prisma.TransactionWhereInput[] = [];
  if (scope) {
    and.push({ OR: [{ walletId: { in: scope.walletIds } }, { toWalletId: { in: scope.walletIds } }] });
  }
  if (filters.walletId) {
    and.push({ OR: [{ walletId: filters.walletId }, { toWalletId: filters.walletId }] });
  }
  // "Expense" means the same thing here as on the dashboard: debt payoffs
  // are spending too, even though they're stored as transfers.
  if (filters.kind === "expense") {
    and.push(spendingWhere());
  }
  if (filters.q) {
    and.push({
      OR: [
        { note: { contains: filters.q, mode: "insensitive" } },
        { category: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }

  return {
    userId,
    ...(filters.kind && filters.kind !== "all" && filters.kind !== "expense" ? { kind: filters.kind } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.from || filters.to
      ? {
          date: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
        }
      : {}),
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

/** Newest first — the ledger's one ordering. `id` keeps the order stable across page boundaries. */
const TRANSACTION_ORDER_BY: Prisma.TransactionOrderByWithRelationInput[] = [
  { date: "desc" },
  { createdAt: "desc" },
  { id: "asc" },
];

/** Fetches one page of a user's transactions, filtered and sorted server-side. `page` is 0-indexed. */
export async function getTransactionsPage(
  userId: string,
  filters: TransactionFilters,
  page: number,
  scope?: TransactionScope,
  pageSize: number = TRANSACTIONS_PAGE_SIZE
): Promise<TransactionsPage> {
  const rows = await prisma.transaction.findMany({
    where: transactionWhere(userId, filters, scope),
    orderBy: TRANSACTION_ORDER_BY,
    skip: page * pageSize,
    take: pageSize + 1,
  });
  return { items: rows.slice(0, pageSize).map(mapTransaction), hasMore: rows.length > pageSize };
}

export interface TransactionsSummary {
  count: number;
  incomeTotal: number;
  /** Everything `isSpending` counts: plain expenses plus debt payoffs. */
  expenseTotal: number;
  /** The transfer-based part of `expenseTotal`, split out per category (just Debt) — every key is present, 0 when none. */
  transferSpending: Record<string, number>;
}

/** Result count and income/expense totals across *all* transactions matching the filters, not just the loaded page. */
export async function getTransactionsSummary(
  userId: string,
  filters: TransactionFilters,
  scope?: TransactionScope
): Promise<TransactionsSummary> {
  const where = transactionWhere(userId, filters, scope);
  // Grouped by kind *and* category so the expense total can be decided by the shared
  // `isSpending` rule in code, rather than a second copy of it in SQL.
  const grouped = await prisma.transaction.groupBy({
    by: ["kind", "category"],
    where,
    _sum: { amount: true },
    _count: { _all: true },
  });

  let count = 0;
  let incomeTotal = 0;
  let expenseTotal = 0;
  const transferSpending: Record<string, number> = Object.fromEntries(SPENDING_TRANSFER_CATEGORIES.map((c) => [c, 0]));
  for (const g of grouped) {
    const amount = Number(g._sum.amount ?? 0);
    count += g._count._all;
    if (g.kind === "income") incomeTotal += amount;
    if (!isSpending(g)) continue;
    expenseTotal += amount;
    if (g.kind === "transfer" && SPENDING_TRANSFER_CATEGORIES.includes(g.category)) {
      transferSpending[g.category] += amount;
    }
  }

  return { count, incomeTotal, expenseTotal, transferSpending };
}

/**
 * Total money in/out of a single wallet across its full history (unaffected by the page's active
 * filters — mirrors the "Total in" / "Total out" summary shown on the wallet detail page).
 */
export async function getWalletFlowTotals(userId: string, walletId: string): Promise<{ inflow: number; outflow: number }> {
  const [outgoing, incomingTransfer] = await Promise.all([
    prisma.transaction.groupBy({ by: ["kind"], where: { userId, walletId }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { userId, toWalletId: walletId, kind: "transfer" }, _sum: { amount: true } }),
  ]);
  const sumFor = (kind: string) => Number(outgoing.find((g) => g.kind === kind)?._sum.amount ?? 0);
  return {
    inflow: sumFor("income") + Number(incomingTransfer._sum.amount ?? 0),
    outflow: sumFor("expense") + sumFor("transfer"),
  };
}
