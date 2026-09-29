export type WalletType = "cash" | "bank" | "savings" | "debt" | "lend";

export type TransactionKind = "expense" | "income" | "transfer";

export interface User {
  id: string;
  name: string;
  email: string;
  /** Null for an account that only ever signed in with Google. */
  passwordHash: string | null;
  passwordSalt: string | null;
  googleId: string | null;
  /** ISO timestamp the email address was confirmed, or null while it's still unverified. */
  emailVerifiedAt: string | null;
  /** ISO timestamp the last verification email was sent, or null if none has been. */
  verificationSentAt: string | null;
  /** ISO timestamp the last password-reset email was sent, or null if none has been. */
  resetPasswordSentAt: string | null;
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

/** What's safe to hand to a page or a client component — no credentials, no provider ids. */
export type PublicUser = Omit<User, "passwordHash" | "passwordSalt" | "googleId" | "verificationSentAt" | "resetPasswordSentAt"> & {
  /** Derived from the ADMIN_EMAILS env var (see `lib/admin.ts`) — never stored on the user. */
  isAdmin: boolean;
};

export type FeatureStatus = "open" | "planned" | "in_progress" | "shipped" | "declined";

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  createdAt: string;
  /** First name of whoever submitted it — enough to credit them without exposing a full name or email. */
  authorName: string;
  votes: number;
  /** Whether the viewing user has liked it. */
  liked: boolean;
  /** Whether the viewing user submitted it. */
  mine: boolean;
}
