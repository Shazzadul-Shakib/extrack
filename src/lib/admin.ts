import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { requireAdmin } from "./session";
import { spendingWhere } from "./finance";
import type { FeatureStatus } from "./types";

// Everything here is admin-only, and aggregate by design: counts and rates across the whole
// user base, never anyone's balances, transactions or notes. Each entry point re-checks the
// caller with `requireAdmin()` itself — the pages check too, but data access is where the
// check has to hold no matter who calls it.

const DAY_MS = 24 * 60 * 60 * 1000;
export const ADMIN_CHART_DAYS = 30;
export const ADMIN_USERS_PAGE_SIZE = 25;

export interface DayPoint {
  /** YYYY-MM-DD (UTC) */
  date: string;
  count: number;
}

export interface AdminOverview {
  users: {
    total: number;
    verified: number;
    withGoogle: number;
    withPassword: number;
    newLast7Days: number;
    newLast30Days: number;
    /** Users who logged at least one transaction in the last 30 days. */
    activeLast30Days: number;
  };
  activity: {
    transactions: number;
    transactionsLast30Days: number;
    wallets: number;
    budgets: number;
  };
  transactionsByKind: { kind: string; count: number }[];
  walletsByType: { type: string; count: number }[];
  /** Most-used spending categories, by number of transactions. */
  topCategories: { category: string; count: number }[];
  signupsByDay: DayPoint[];
  transactionsByDay: DayPoint[];
  features: {
    total: number;
    votes: number;
    byStatus: { status: FeatureStatus; count: number }[];
    top: { id: string; title: string; votes: number; status: FeatureStatus }[];
  };
}

/** The last `days` UTC dates ending today, oldest first, each filled from `counts` (0 when absent). */
function fillDays(counts: Map<string, number>, days: number): DayPoint[] {
  const today = new Date();
  const points: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getTime() - i * DAY_MS).toISOString().slice(0, 10);
    points.push({ date, count: counts.get(date) ?? 0 });
  }
  return points;
}

async function dailyCounts(table: "users" | "transactions", since: Date): Promise<Map<string, number>> {
  // created_at is stored as UTC, so date_trunc buckets by UTC day — same as `fillDays` above.
  const rows =
    table === "users"
      ? await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
          SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
          FROM users WHERE created_at >= ${since} GROUP BY 1`
      : await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
          SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
          FROM transactions WHERE created_at >= ${since} GROUP BY 1`;
  return new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.count)]));
}

export async function getAdminOverview(): Promise<AdminOverview> {
  await requireAdmin();

  const now = Date.now();
  const since7 = new Date(now - 7 * DAY_MS);
  const since30 = new Date(now - ADMIN_CHART_DAYS * DAY_MS);
  // Chart windows start at the beginning of the oldest day shown, so its bar isn't a partial day.
  const chartSince = new Date(new Date(now - (ADMIN_CHART_DAYS - 1) * DAY_MS).toISOString().slice(0, 10));

  const [
    totalUsers,
    verifiedUsers,
    googleUsers,
    passwordUsers,
    newUsers7,
    newUsers30,
    activeUsers,
    totalTransactions,
    transactions30,
    totalWallets,
    totalBudgets,
    kinds,
    walletTypes,
    categories,
    signups,
    txByDay,
    featureTotal,
    featureVotes,
    featureStatuses,
    topFeatures,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
    prisma.user.count({ where: { googleId: { not: null } } }),
    prisma.user.count({ where: { passwordHash: { not: null } } }),
    prisma.user.count({ where: { createdAt: { gte: since7 } } }),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.transaction.groupBy({ by: ["userId"], where: { createdAt: { gte: since30 } } }),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { createdAt: { gte: since30 } } }),
    prisma.wallet.count({ where: { deletedAt: null } }),
    prisma.budget.count(),
    prisma.transaction.groupBy({ by: ["kind"], _count: { _all: true } }),
    prisma.wallet.groupBy({ by: ["type"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.transaction.groupBy({
      by: ["category"],
      where: spendingWhere() as Prisma.TransactionWhereInput,
      _count: { category: true },
      orderBy: { _count: { category: "desc" } },
      take: 8,
    }),
    dailyCounts("users", chartSince),
    dailyCounts("transactions", chartSince),
    prisma.featureRequest.count(),
    prisma.featureVote.count(),
    prisma.featureRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.featureRequest.findMany({
      orderBy: [{ votes: { _count: "desc" } }, { createdAt: "desc" }],
      take: 5,
      select: { id: true, title: true, status: true, _count: { select: { votes: true } } },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      verified: verifiedUsers,
      withGoogle: googleUsers,
      withPassword: passwordUsers,
      newLast7Days: newUsers7,
      newLast30Days: newUsers30,
      activeLast30Days: activeUsers.length,
    },
    activity: {
      transactions: totalTransactions,
      transactionsLast30Days: transactions30,
      wallets: totalWallets,
      budgets: totalBudgets,
    },
    transactionsByKind: kinds.map((k) => ({ kind: k.kind, count: k._count._all })).sort((a, b) => b.count - a.count),
    walletsByType: walletTypes.map((w) => ({ type: w.type, count: w._count._all })).sort((a, b) => b.count - a.count),
    topCategories: categories.map((c) => ({ category: c.category, count: c._count.category })),
    signupsByDay: fillDays(signups, ADMIN_CHART_DAYS),
    transactionsByDay: fillDays(txByDay, ADMIN_CHART_DAYS),
    features: {
      total: featureTotal,
      votes: featureVotes,
      byStatus: featureStatuses.map((s) => ({ status: s.status, count: s._count._all })),
      top: topFeatures.map((f) => ({ id: f.id, title: f.title, status: f.status, votes: f._count.votes })),
    },
  };
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  verified: boolean;
  withGoogle: boolean;
  withPassword: boolean;
  transactionCount: number;
  /** When they last logged a transaction, or null if never. */
  lastActiveAt: string | null;
}

export async function getAdminUsers(input: {
  page: number;
  q?: string;
}): Promise<{ rows: AdminUserRow[]; total: number; pageSize: number }> {
  await requireAdmin();

  const q = input.q?.trim();
  const where: Prisma.UserWhereInput = q
    ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: Math.max(0, input.page - 1) * ADMIN_USERS_PAGE_SIZE,
      take: ADMIN_USERS_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        emailVerifiedAt: true,
        googleId: true,
        passwordHash: true,
        _count: { select: { transactions: true } },
      },
    }),
  ]);

  const lastActive = users.length
    ? await prisma.transaction.groupBy({
        by: ["userId"],
        where: { userId: { in: users.map((u) => u.id) } },
        _max: { createdAt: true },
      })
    : [];
  const lastActiveByUser = new Map(lastActive.map((row) => [row.userId, row._max.createdAt]));

  return {
    total,
    pageSize: ADMIN_USERS_PAGE_SIZE,
    rows: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt.toISOString(),
      verified: !!u.emailVerifiedAt,
      withGoogle: !!u.googleId,
      withPassword: !!u.passwordHash,
      transactionCount: u._count.transactions,
      lastActiveAt: lastActiveByUser.get(u.id)?.toISOString() ?? null,
    })),
  };
}

export interface AdminFeatureRequest {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  createdAt: string;
  votes: number;
  /** Admins see who filed a request in full, to follow up or spot abuse. */
  authorName: string;
  authorEmail: string;
}

/** Every feature request, most liked first, for moderation. */
export async function getAdminFeatureRequests(): Promise<AdminFeatureRequest[]> {
  await requireAdmin();
  const rows = await prisma.featureRequest.findMany({
    include: { user: { select: { name: true, email: true } }, _count: { select: { votes: true } } },
    orderBy: [{ votes: { _count: "desc" } }, { createdAt: "desc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    votes: row._count.votes,
    authorName: row.user.name,
    authorEmail: row.user.email,
  }));
}
