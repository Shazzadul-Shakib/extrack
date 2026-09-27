export type WalletType = "cash" | "bank" | "savings" | "debt" | "lend";

export type TransactionKind = "expense" | "income" | "transfer";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  balance: number;
  currency: string;
  note: string;
  archived: boolean;
  /** ISO timestamp of a soft delete, or null. A deleted wallet keeps its row and
   *  transactions but is filtered out of every list, picker, and total. */
  deletedAt: string | null;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  toWalletId: string | null;
  kind: TransactionKind;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  year: number;
  month: number;
  note: string;
  createdAt: string;
}

export interface Database {
  users: User[];
  wallets: Wallet[];
  transactions: Transaction[];
  budgets: Budget[];
}

export type PublicUser = Omit<User, "passwordHash" | "passwordSalt">;
