import type { Transaction, Wallet, WalletType } from "./types";
import { walletDelta } from "./finance";
import type { TransactionFilters } from "./transactionFilters";

export const WALLET_HISTORY_PAGE_SIZE = 20;

export type WalletEventType =
  | "borrowed"
  | "debtPaid"
  | "lent"
  | "gotPaid"
  | "saved"
  | "withdrew"
  | "opening";

export interface WalletEvent {
  id: string;
  date: string;
  type: WalletEventType;
  walletId: string;
  walletName: string;
  /** The wallet's own note — what the loan / debt / savings goal is for. */
  walletNote: string;
  amount: number;
  /** Wallet on the other side of a transfer, or null. */
  counterpartName: string | null;
  /** The transaction's own note, when it has one. */
  note: string;
  /** What the wallet's balance was right after this event. */
  balanceAfter: number;
  sortKey: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function eventType(walletType: WalletType, delta: number): WalletEventType {
  if (walletType === "debt") return delta > 0 ? "borrowed" : "debtPaid";
  if (walletType === "lend") return delta > 0 ? "lent" : "gotPaid";
  return delta > 0 ? "saved" : "withdrew";
}

/**
 * The life of every wallet of `type`, newest first: when it was opened and for how much, then each
 * time money went in or out and where it came from / went to. A wallet only stores its current
 * balance, so its opening amount is worked out backwards: current balance minus every transaction's
 * effect. (A wallet funded at creation has an opening amount of 0 — its funding transfer is the
 * first event instead.)
 */
export function buildWalletHistory(type: WalletType, wallets: Wallet[], transactions: Transaction[]): WalletEvent[] {
  const byId = new Map(wallets.map((w) => [w.id, w]));
  const events: WalletEvent[] = [];

  for (const wallet of wallets.filter((w) => w.type === type)) {
    const txs = transactions
      .filter((t) => t.walletId === wallet.id || t.toWalletId === wallet.id)
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

    const deltaOf = (t: Transaction): number => {
      let d = 0;
      if (t.walletId === wallet.id) d += walletDelta(wallet.type, t.kind === "income" ? "income" : "expense", t.amount);
      if (t.kind === "transfer" && t.toWalletId === wallet.id) d += walletDelta(wallet.type, "income", t.amount);
      return d;
    };

    const opening = round2(wallet.balance - txs.reduce((s, t) => s + deltaOf(t), 0));
    let running = 0;

    if (opening > 0) {
      running = opening;
      events.push({
        id: `${wallet.id}:open`,
        date: wallet.createdAt.slice(0, 10),
        type: type === "savings" ? "opening" : type === "debt" ? "borrowed" : "lent",
        walletId: wallet.id,
        walletName: wallet.name,
        walletNote: wallet.note,
        amount: opening,
        counterpartName: null,
        note: "",
        balanceAfter: opening,
        sortKey: `${wallet.createdAt.slice(0, 10)}|${wallet.createdAt}|0`,
      });
    }

    for (const t of txs) {
      const delta = deltaOf(t);
      if (delta === 0) continue;
      running = round2(running + delta);
      const otherId = t.walletId === wallet.id ? t.toWalletId : t.walletId;
      events.push({
        id: `${t.id}:${wallet.id}`,
        date: t.date,
        type: eventType(type, delta),
        walletId: wallet.id,
        walletName: wallet.name,
        walletNote: wallet.note,
        amount: Math.abs(delta),
        counterpartName: t.kind === "transfer" && otherId ? (byId.get(otherId)?.name ?? null) : null,
        note: t.note,
        balanceAfter: running,
        sortKey: `${t.date}|${t.createdAt}|1`,
      });
    }
  }

  return events.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

/** Applies the page's search / wallet / date filters to the history (dates are inclusive YYYY-MM-DD). */
export function filterWalletHistory(events: WalletEvent[], filters: TransactionFilters): WalletEvent[] {
  const q = filters.q?.trim().toLowerCase();
  return events.filter((e) => {
    if (filters.walletId && e.walletId !== filters.walletId) return false;
    if (filters.from && e.date < filters.from) return false;
    if (filters.to && e.date > filters.to) return false;
    if (q && ![e.walletName, e.walletNote, e.note, e.counterpartName ?? ""].some((v) => v.toLowerCase().includes(q))) return false;
    return true;
  });
}
