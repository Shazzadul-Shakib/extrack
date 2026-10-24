import { prisma } from "./db";
import { newId } from "./id";
import { INVESTMENT_ADJUSTMENT_CATEGORY, INVESTMENT_CATEGORY, INVESTMENT_PRINCIPAL_CATEGORY, OPENING_BALANCE_CATEGORY } from "./categories";
import { MutationError, recordTransaction, removeTransaction, type TxClient } from "./mutations";
import type { Investment, InvestmentEntry, InvestmentEntryKind, InvestmentType } from "./investments";

type InvestmentRow = Awaited<ReturnType<typeof prisma.investment.findFirstOrThrow>>;
type EntryRow = Awaited<ReturnType<typeof prisma.investmentEntry.findFirstOrThrow>>;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function mapInvestment(row: InvestmentRow): Investment {
  return {
    id: row.id,
    userId: row.userId,
    walletId: row.walletId,
    name: row.name,
    type: row.type,
    institution: row.institution,
    startDate: isoDate(row.startDate),
    maturityDate: row.maturityDate ? isoDate(row.maturityDate) : null,
    ratePercent: row.ratePercent === null ? null : Number(row.ratePercent),
    rebateEligible: row.rebateEligible,
    taxedAtSource: row.taxedAtSource,
    note: row.note,
    closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapEntry(row: EntryRow): InvestmentEntry {
  return {
    id: row.id,
    investmentId: row.investmentId,
    kind: row.kind,
    amount: Number(row.amount),
    date: isoDate(row.date),
    walletId: row.walletId,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getUserInvestments(userId: string): Promise<Investment[]> {
  const rows = await prisma.investment.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return rows.map(mapInvestment);
}

export async function getInvestment(userId: string, id: string): Promise<Investment | null> {
  const row = await prisma.investment.findFirst({ where: { id, userId } });
  return row ? mapInvestment(row) : null;
}

/** The investment an `investment` wallet belongs to, for sending a wallet link to its investment page. */
export async function getInvestmentIdForWallet(userId: string, walletId: string): Promise<string | null> {
  const row = await prisma.investment.findFirst({ where: { userId, walletId }, select: { id: true } });
  return row?.id ?? null;
}

export async function getUserInvestmentEntries(userId: string): Promise<InvestmentEntry[]> {
  const rows = await prisma.investmentEntry.findMany({ where: { userId }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] });
  return rows.map(mapEntry);
}

export interface InvestmentInput {
  name: string;
  type: InvestmentType;
  institution: string;
  startDate: string;
  maturityDate: string | null;
  ratePercent: number | null;
  rebateEligible: boolean;
  taxedAtSource: boolean;
  note: string;
}

function data(input: InvestmentInput) {
  return {
    name: input.name,
    type: input.type,
    institution: input.institution,
    startDate: new Date(input.startDate),
    maturityDate: input.maturityDate ? new Date(input.maturityDate) : null,
    ratePercent: input.ratePercent,
    rebateEligible: input.rebateEligible,
    taxedAtSource: input.taxedAtSource,
    note: input.note,
  };
}

/** Every investment is backed by its own wallet of type `investment`, named after it. */
export async function createInvestment(userId: string, input: InvestmentInput): Promise<Investment> {
  const row = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.create({
      data: { id: newId("wal"), userId, name: input.name, type: "investment", balance: 0, currency: "BDT", note: "" },
    });
    return tx.investment.create({ data: { id: newId("inv"), userId, walletId: wallet.id, ...data(input) } });
  });
  return mapInvestment(row);
}

export async function updateInvestment(userId: string, id: string, input: InvestmentInput): Promise<Investment> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.investment.findFirst({ where: { id, userId } });
    if (!existing) throw new MutationError("Investment not found");
    if (existing.walletId) await tx.wallet.update({ where: { id: existing.walletId }, data: { name: input.name } });
    return mapInvestment(await tx.investment.update({ where: { id }, data: data(input) }));
  });
}

/** Deletes an investment and its whole history, giving every wallet movement it caused back. */
export async function deleteInvestment(userId: string, id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.investment.findFirst({ where: { id, userId } });
    if (!existing) throw new MutationError("Investment not found");
    const entries = await tx.investmentEntry.findMany({ where: { investmentId: id, userId } });
    for (const e of entries) if (e.transactionId) await removeTransaction(tx, userId, e.transactionId);
    await tx.investment.delete({ where: { id } });
    // Its wallet is empty now; soft-delete it like any other wallet so old statements still resolve its name.
    if (existing.walletId) await tx.wallet.update({ where: { id: existing.walletId }, data: { deletedAt: new Date() } });
  });
}

export async function reopenInvestment(userId: string, id: string): Promise<void> {
  const existing = await prisma.investment.findFirst({ where: { id, userId } });
  if (!existing) throw new MutationError("Investment not found");
  await prisma.investment.update({ where: { id }, data: { closedAt: null } });
}

export interface EntryInput {
  kind: InvestmentEntryKind;
  amount: number;
  date: string;
  /**
   * The other wallet in the movement: where a contribution is paid from, where a return is paid
   * out to, where a withdrawal goes. Null means no other wallet — an existing investment's
   * contribution, or a return that is reinvested. Ignored for a value update.
   */
  walletId: string | null;
  note: string;
}

type WithWallet = InvestmentRow & { walletId: string };

async function addEntryInTx(tx: TxClient, userId: string, inv: WithWallet, input: EntryInput): Promise<void> {
  const other = input.kind === "value_update" ? null : input.walletId;
  if (other) {
    const wallet = await tx.wallet.findFirst({ where: { id: other, userId, deletedAt: null } });
    if (!wallet || !["cash", "bank", "savings"].includes(wallet.type)) {
      throw new MutationError("Pick a cash, bank or savings wallet.");
    }
  }
  if (input.kind === "withdrawal" && !other) throw new MutationError("Pick the wallet the money goes to.");

  const base = { amount: input.amount, date: input.date, note: input.note || inv.name, investmentId: inv.id };
  let transactionId: string | null = null;
  // The wallet recorded on the entry: for a reinvested return, the investment's own wallet.
  let entryWalletId: string | null = other;

  if (input.kind === "contribution") {
    // Paid from a wallet, it's a transfer into the investment's wallet. With no wallet it's
    // money that was already invested before Extrack, recorded as an opening balance.
    const txn = other
      ? await recordTransaction(tx, userId, { ...base, walletId: other, toWalletId: inv.walletId, kind: "transfer", category: INVESTMENT_CATEGORY })
      : await recordTransaction(tx, userId, { ...base, walletId: inv.walletId, toWalletId: null, kind: "income", category: OPENING_BALANCE_CATEGORY });
    transactionId = txn.id;
  } else if (input.kind === "return") {
    // Reinvested by default: added to the investment's own wallet, so the next return is
    // measured on the larger total. Or paid out into a wallet you pick.
    entryWalletId = other ?? inv.walletId;
    const txn = await recordTransaction(tx, userId, { ...base, walletId: entryWalletId, toWalletId: null, kind: "income", category: INVESTMENT_CATEGORY });
    transactionId = txn.id;
  } else if (input.kind === "withdrawal") {
    const txn = await recordTransaction(tx, userId, { ...base, walletId: inv.walletId, toWalletId: other, kind: "transfer", category: INVESTMENT_PRINCIPAL_CATEGORY });
    transactionId = txn.id;
  } else if (input.kind === "writeoff") {
    entryWalletId = inv.walletId;
    const txn = await recordTransaction(tx, userId, { ...base, walletId: inv.walletId, toWalletId: null, kind: "expense", category: INVESTMENT_ADJUSTMENT_CATEGORY });
    transactionId = txn.id;
  }

  await tx.investmentEntry.create({
    data: {
      id: newId("ive"),
      userId,
      investmentId: inv.id,
      kind: input.kind,
      amount: input.amount,
      date: new Date(input.date),
      walletId: entryWalletId,
      transactionId,
      note: input.note,
    },
  });
}

/**
 * An investment made before wallets backed investments has none. Gives it one and replays its
 * history into it — undoing the old wallet movements first — so it behaves like any other.
 */
async function ensureWallet(tx: TxClient, userId: string, inv: InvestmentRow): Promise<WithWallet> {
  if (inv.walletId) return inv as WithWallet;
  const wallet = await tx.wallet.create({
    data: { id: newId("wal"), userId, name: inv.name, type: "investment", balance: 0, currency: "BDT", note: "" },
  });
  const upgraded = (await tx.investment.update({ where: { id: inv.id }, data: { walletId: wallet.id } })) as WithWallet;
  const entries = await tx.investmentEntry.findMany({ where: { investmentId: inv.id, userId }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] });
  for (const e of entries) if (e.transactionId) await removeTransaction(tx, userId, e.transactionId);
  await tx.investmentEntry.deleteMany({ where: { investmentId: inv.id, userId } });
  for (const e of entries) {
    await addEntryInTx(tx, userId, upgraded, {
      kind: e.kind,
      amount: Number(e.amount),
      date: e.date.toISOString().slice(0, 10),
      walletId: e.walletId,
      note: e.note,
    });
  }
  return upgraded;
}

export async function addInvestmentEntry(userId: string, investmentId: string, input: EntryInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const found = await tx.investment.findFirst({ where: { id: investmentId, userId } });
    if (!found) throw new MutationError("Investment not found");
    if (found.closedAt) throw new MutationError("This investment is closed — reopen it to add to it.");
    await addEntryInTx(tx, userId, await ensureWallet(tx, userId, found), input);
  });
}

/**
 * Matures or sells an investment. `received` is the cash that came back into `walletId`. If it is
 * more than what the wallet holds, the difference is profit (added to the wallet first); if it is
 * less, the difference is removed from the investment as an adjustment. Either way the wallet ends at zero and the
 * investment closes.
 */
export async function closeInvestment(
  userId: string,
  investmentId: string,
  input: { date: string; received: number; walletId: string; note: string }
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const found = await tx.investment.findFirst({ where: { id: investmentId, userId } });
    if (!found) throw new MutationError("Investment not found");
    if (found.closedAt) throw new MutationError("This investment is already closed.");
    const inv = await ensureWallet(tx, userId, found);
    const wallet = await tx.wallet.findFirstOrThrow({ where: { id: inv.walletId } });
    const balance = Number(wallet.balance);
    const { received, date, note } = input;
    const base = { date, note };

    if (received > balance) {
      await addEntryInTx(tx, userId, inv, { ...base, kind: "return", amount: Math.round((received - balance) * 100) / 100, walletId: null });
    }
    if (received > 0) await addEntryInTx(tx, userId, inv, { ...base, kind: "withdrawal", amount: received, walletId: input.walletId });
    if (received < balance) {
      await addEntryInTx(tx, userId, inv, { ...base, kind: "writeoff", amount: Math.round((balance - received) * 100) / 100, walletId: null });
    }
    await tx.investment.update({ where: { id: investmentId }, data: { closedAt: new Date(date) } });
  });
}

export async function deleteInvestmentEntry(userId: string, entryId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const entry = await tx.investmentEntry.findFirst({ where: { id: entryId, userId } });
    if (!entry) throw new MutationError("Entry not found");
    if (entry.transactionId) await removeTransaction(tx, userId, entry.transactionId);
    await tx.investmentEntry.delete({ where: { id: entryId } });
    const inv = await tx.investment.findFirst({ where: { id: entry.investmentId } });
    if (inv?.walletId) {
      const wallet = await tx.wallet.findFirst({ where: { id: inv.walletId } });
      // Undoing a contribution that later returns or withdrawals depended on would leave a negative balance.
      if (wallet && Number(wallet.balance) < 0) throw new MutationError("Remove the later withdrawals and returns first.");
    }
  });
}
