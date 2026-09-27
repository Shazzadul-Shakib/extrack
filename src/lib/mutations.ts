import { prisma } from "./db";
import { newId } from "./id";
import { walletDelta } from "./finance";
import { TRANSFER_CATEGORY, SAVINGS_CATEGORY, DEBT_CATEGORY, LEND_CATEGORY } from "./categories";
import type { Budget, Transaction, TransactionKind, Wallet, WalletType } from "./types";
import type { Prisma } from "@prisma/client";

export class MutationError extends Error {}

// Derived from `prisma` itself (rather than the generated `Prisma.TransactionClient`)
// because `prisma` is a `$extends`-wrapped client (see db.ts) with a different shape.
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function mapWallet(row: {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  balance: Prisma.Decimal;
  currency: string;
  note: string;
  archived: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}): Wallet {
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

function mapTransaction(row: {
  id: string;
  userId: string;
  walletId: string;
  toWalletId: string | null;
  kind: TransactionKind;
  category: string;
  amount: Prisma.Decimal;
  date: Date;
  note: string;
  createdAt: Date;
}): Transaction {
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

export async function createWallet(
  userId: string,
  input: {
    name: string;
    type: WalletType;
    balance: number;
    currency: string;
    note: string;
    /** Existing wallet to draw the starting balance from, recorded as a transfer. */
    fundingWalletId?: string | null;
  }
): Promise<Wallet> {
  if (input.fundingWalletId && input.balance > 0) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.wallet.create({
        data: {
          id: newId("wal"),
          userId,
          name: input.name,
          type: input.type,
          balance: 0,
          currency: input.currency || "BDT",
          note: input.note,
        },
      });
      await recordTransaction(tx, userId, {
        walletId: input.fundingWalletId!,
        toWalletId: created.id,
        kind: "transfer",
        category: TRANSFER_CATEGORY,
        amount: input.balance,
        date: new Date().toISOString().slice(0, 10),
        note: `Initial funding for ${input.name}`,
      });
      const funded = await tx.wallet.findFirstOrThrow({ where: { id: created.id } });
      return mapWallet(funded);
    });
  }

  // A plain starting balance on an asset wallet (no funding source picked) is new
  // money entering the tracked system, so it's recorded as income — otherwise it
  // would never show up in the income/expense totals or trend chart. A debt or
  // lend wallet's starting balance is different: it's a pre-existing amount
  // already owed (or already lent out), not a dated event, so it's just set
  // directly with no transaction.
  if (input.balance > 0 && input.type !== "debt" && input.type !== "lend") {
    return prisma.$transaction(async (tx) => {
      const created = await tx.wallet.create({
        data: {
          id: newId("wal"),
          userId,
          name: input.name,
          type: input.type,
          balance: 0,
          currency: input.currency || "BDT",
          note: input.note,
        },
      });
      await recordTransaction(tx, userId, {
        walletId: created.id,
        toWalletId: null,
        kind: "income",
        category: "Other",
        amount: input.balance,
        date: new Date().toISOString().slice(0, 10),
        note: "Starting balance",
      });
      const funded = await tx.wallet.findFirstOrThrow({ where: { id: created.id } });
      return mapWallet(funded);
    });
  }

  const row = await prisma.wallet.create({
    data: {
      id: newId("wal"),
      userId,
      name: input.name,
      type: input.type,
      balance: input.balance,
      currency: input.currency || "BDT",
      note: input.note,
    },
  });
  return mapWallet(row);
}

export async function updateWallet(
  userId: string,
  walletId: string,
  input: { name: string; note: string }
): Promise<Wallet> {
  const existing = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
  if (!existing) throw new MutationError("Wallet not found");
  const row = await prisma.wallet.update({
    where: { id: walletId },
    data: { name: input.name, note: input.note },
  });
  return mapWallet(row);
}

/**
 * Soft delete. The wallet row and every transaction that references it stay in
 * the database — history is untouched — but a `deletedAt` timestamp drops the
 * wallet out of every list, picker, and total (see `getUserWallets`). Only an
 * empty wallet can be deleted: a non-zero balance would otherwise vanish from
 * net worth / totals with no offsetting transaction to explain it.
 */
export async function deleteWallet(userId: string, walletId: string): Promise<void> {
  const existing = await prisma.wallet.findFirst({ where: { id: walletId, userId, deletedAt: null } });
  if (!existing) throw new MutationError("Wallet not found");
  if (Number(existing.balance) !== 0) {
    throw new MutationError(
      existing.type === "debt"
        ? "Pay this debt off to zero before deleting it."
        : existing.type === "lend"
          ? "Get this loan repaid to zero before deleting it."
          : "Move or withdraw the remaining balance before deleting this wallet."
    );
  }
  await prisma.wallet.update({ where: { id: walletId }, data: { deletedAt: new Date() } });
}

export interface TransactionInput {
  walletId: string;
  toWalletId: string | null;
  kind: TransactionKind;
  category: string;
  amount: number;
  date: string;
  note: string;
}

/**
 * Draws down an asset wallet (never a debt wallet — "balance" there means amount
 * owed, which has no upper bound) and throws if that would take it negative.
 * Only checked on forward application (sign=1); reversing a past effect always
 * gives money back, so it can never overdraw.
 */
function assertSufficientFunds(wallet: { name: string; type: WalletType; balance: Prisma.Decimal }, delta: number, sign: 1 | -1) {
  if (sign !== 1 || wallet.type === "debt") return;
  if (Number(wallet.balance) + delta < 0) {
    throw new MutationError(`Not enough balance in ${wallet.name} for this amount.`);
  }
}

/**
 * Applies (sign=1) or reverses (sign=-1) a transaction's effect on its wallet
 * balance(s). Returns the transfer's destination wallet type (if any) so the
 * caller can auto-tag the category — reuses the row already fetched here
 * rather than querying it again.
 */
async function applyEffect(tx: TxClient, userId: string, input: TransactionInput, sign: 1 | -1): Promise<WalletType | null> {
  const fromWallet = await tx.wallet.findFirst({ where: { id: input.walletId, userId } });
  if (!fromWallet) throw new MutationError("Source wallet not found");

  if (input.kind === "transfer") {
    if (!input.toWalletId) throw new MutationError("Destination wallet not found");
    const toWallet = await tx.wallet.findFirst({ where: { id: input.toWalletId, userId } });
    if (!toWallet) throw new MutationError("Destination wallet not found");
    if (toWallet.id === fromWallet.id) throw new MutationError("Pick two different wallets");

    const fromDelta = sign * walletDelta(fromWallet.type, "expense", input.amount);
    assertSufficientFunds(fromWallet, fromDelta, sign);

    await tx.wallet.update({
      where: { id: fromWallet.id },
      data: { balance: { increment: fromDelta } },
    });
    await tx.wallet.update({
      where: { id: toWallet.id },
      data: { balance: { increment: sign * walletDelta(toWallet.type, "income", input.amount) } },
    });
    return toWallet.type;
  }

  const delta = sign * walletDelta(fromWallet.type, input.kind, input.amount);
  if (input.kind === "expense") assertSufficientFunds(fromWallet, delta, sign);

  await tx.wallet.update({
    where: { id: fromWallet.id },
    data: { balance: { increment: delta } },
  });
  return null;
}

/**
 * A transfer's category is driven by its destination, not whatever UI created
 * it: landing in a savings wallet always reads as "Savings", landing in a debt
 * wallet always reads as "Debt" (paying it down), landing in a lend wallet
 * always reads as "Lend" (money handed to someone) — covering the dedicated
 * Clear debt / fund-a-savings-wallet / lend-money-out flows AND a plain manual
 * transfer alike. Anything else keeps its given category, falling back to
 * "Transfer" — including a repayment transfer *out of* a lend wallet, same as
 * a savings withdrawal.
 */
function resolveCategory(input: TransactionInput, toWalletType: WalletType | null): string {
  if (input.kind !== "transfer") return input.category;
  if (toWalletType === "savings") return SAVINGS_CATEGORY;
  if (toWalletType === "debt") return DEBT_CATEGORY;
  if (toWalletType === "lend") return LEND_CATEGORY;
  return input.category || TRANSFER_CATEGORY;
}

/**
 * A debt paid off in full, or a loan repaid in full, drops out of Debts/Lending/
 * totals/pickers, but keeps its wallet row (and history) intact.
 */
async function archiveIfSettled(tx: TxClient, walletId: string | null) {
  if (!walletId) return;
  const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
  if (wallet && (wallet.type === "debt" || wallet.type === "lend") && !wallet.archived && Number(wallet.balance) === 0) {
    await tx.wallet.update({ where: { id: walletId }, data: { archived: true } });
  }
}

/** Applies a transaction's balance effect and records it, within an existing transaction client. */
async function recordTransaction(tx: TxClient, userId: string, input: TransactionInput): Promise<Transaction> {
  const toWalletType = await applyEffect(tx, userId, input, 1);
  await archiveIfSettled(tx, input.walletId);
  if (input.kind === "transfer") await archiveIfSettled(tx, input.toWalletId);

  const created = await tx.transaction.create({
    data: {
      id: newId("txn"),
      userId,
      walletId: input.walletId,
      toWalletId: input.kind === "transfer" ? input.toWalletId : null,
      kind: input.kind,
      category: resolveCategory(input, toWalletType),
      amount: input.amount,
      date: new Date(input.date),
      note: input.note,
    },
  });
  return mapTransaction(created);
}

export async function createTransaction(userId: string, input: TransactionInput): Promise<Transaction> {
  return prisma.$transaction((tx) => recordTransaction(tx, userId, input));
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: TransactionInput
): Promise<Transaction> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({ where: { id: transactionId, userId } });
    if (!existing) throw new MutationError("Transaction not found");

    // Reverse the old effect, then apply the new one.
    await applyEffect(
      tx,
      userId,
      {
        walletId: existing.walletId,
        toWalletId: existing.toWalletId,
        kind: existing.kind,
        category: existing.category,
        amount: Number(existing.amount),
        date: existing.date.toISOString().slice(0, 10),
        note: existing.note,
      },
      -1
    );
    const toWalletType = await applyEffect(tx, userId, input, 1);
    await archiveIfSettled(tx, input.walletId);
    if (input.kind === "transfer") await archiveIfSettled(tx, input.toWalletId);

    const updated = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        walletId: input.walletId,
        toWalletId: input.kind === "transfer" ? input.toWalletId : null,
        kind: input.kind,
        category: resolveCategory(input, toWalletType),
        amount: input.amount,
        date: new Date(input.date),
        note: input.note,
      },
    });
    return mapTransaction(updated);
  });
}

function mapBudget(row: {
  id: string;
  userId: string;
  category: string;
  amount: Prisma.Decimal;
  year: number;
  month: number;
  note: string;
  createdAt: Date;
}): Budget {
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

export interface BudgetInput {
  category: string;
  amount: number;
  year: number;
  month: number;
  note: string;
}

export async function createBudget(userId: string, input: BudgetInput): Promise<Budget> {
  const existing = await prisma.budget.findUnique({
    where: { userId_year_month_category: { userId, year: input.year, month: input.month, category: input.category } },
  });
  if (existing) {
    throw new MutationError(`A budget for ${input.category} already exists for that month — edit it instead.`);
  }

  const row = await prisma.budget.create({
    data: {
      id: newId("bud"),
      userId,
      category: input.category,
      amount: input.amount,
      year: input.year,
      month: input.month,
      note: input.note,
    },
  });
  return mapBudget(row);
}

export async function updateBudget(userId: string, budgetId: string, input: BudgetInput): Promise<Budget> {
  const existing = await prisma.budget.findFirst({ where: { id: budgetId, userId } });
  if (!existing) throw new MutationError("Budget not found");

  const clash = await prisma.budget.findFirst({
    where: { userId, year: input.year, month: input.month, category: input.category, NOT: { id: budgetId } },
  });
  if (clash) {
    throw new MutationError(`A budget for ${input.category} already exists for that month.`);
  }

  const row = await prisma.budget.update({
    where: { id: budgetId },
    data: {
      category: input.category,
      amount: input.amount,
      year: input.year,
      month: input.month,
      note: input.note,
    },
  });
  return mapBudget(row);
}

export async function deleteBudget(userId: string, budgetId: string): Promise<void> {
  const existing = await prisma.budget.findFirst({ where: { id: budgetId, userId } });
  if (!existing) throw new MutationError("Budget not found");
  await prisma.budget.delete({ where: { id: budgetId } });
}

export interface CopyBudgetsInput {
  fromYear: number;
  fromMonth: number;
  toYear: number;
  toMonth: number;
}

export interface CopyBudgetsResult {
  /** Categories actually inserted into the target month. */
  copied: string[];
  /** Categories left untouched because the target month already had a budget for them. */
  skipped: string[];
}

/**
 * Copies every budgeted category from one month into another. A target category that
 * already has a budget is left untouched (not overwritten) — `skipped` names the source
 * categories that were left out this way.
 */
export async function copyBudgets(userId: string, input: CopyBudgetsInput): Promise<CopyBudgetsResult> {
  if (input.fromYear === input.toYear && input.fromMonth === input.toMonth) {
    throw new MutationError("Pick a different month to copy from.");
  }

  const [source, target] = await Promise.all([
    prisma.budget.findMany({ where: { userId, year: input.fromYear, month: input.fromMonth } }),
    prisma.budget.findMany({
      where: { userId, year: input.toYear, month: input.toMonth },
      select: { category: true },
    }),
  ]);

  if (source.length === 0) {
    throw new MutationError("That month doesn't have any budgets to copy.");
  }

  const existingCategories = new Set(target.map((b) => b.category));
  const toCopy = source.filter((b) => !existingCategories.has(b.category));
  const skipped = source.filter((b) => existingCategories.has(b.category)).map((b) => b.category);

  if (toCopy.length === 0) {
    throw new MutationError("Every category from that month already has a budget in the current month.");
  }

  await prisma.budget.createMany({
    data: toCopy.map((b) => ({
      id: newId("bud"),
      userId,
      category: b.category,
      amount: b.amount,
      year: input.toYear,
      month: input.toMonth,
      note: b.note,
    })),
    skipDuplicates: true,
  });

  return { copied: toCopy.map((b) => b.category), skipped };
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({ where: { id: transactionId, userId } });
    if (!existing) throw new MutationError("Transaction not found");

    await applyEffect(
      tx,
      userId,
      {
        walletId: existing.walletId,
        toWalletId: existing.toWalletId,
        kind: existing.kind,
        category: existing.category,
        amount: Number(existing.amount),
        date: existing.date.toISOString().slice(0, 10),
        note: existing.note,
      },
      -1
    );

    await tx.transaction.delete({ where: { id: transactionId } });
  });
}
