import { prisma } from "./db";
import { newId } from "./id";
import { FEATURE_REQUESTS_PER_DAY } from "./featureConstants";
import type { FeatureRequest, FeatureStatus } from "./types";

export type FeatureSort = "top" | "new";

const MAX_LISTED = 100;

/** A user-facing failure (rate limit, request gone) as opposed to an unexpected error. */
export class FeatureError extends Error {
  constructor(public code: "rate_limited" | "not_found") {
    super(code);
  }
}

/** Feature requests with their like counts, as seen by `viewerId` (whether they've liked / authored each one). */
export async function getFeatureRequests(viewerId: string, sort: FeatureSort): Promise<FeatureRequest[]> {
  const rows = await prisma.featureRequest.findMany({
    include: {
      user: { select: { name: true } },
      _count: { select: { votes: true } },
      votes: { where: { userId: viewerId }, select: { userId: true } },
    },
    orderBy: sort === "new" ? [{ createdAt: "desc" }] : [{ votes: { _count: "desc" } }, { createdAt: "desc" }],
    take: MAX_LISTED,
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    authorName: row.user.name.split(" ")[0] || row.user.name,
    votes: row._count.votes,
    liked: row.votes.length > 0,
    mine: row.userId === viewerId,
  }));
}

export async function createFeatureRequest(userId: string, input: { title: string; description: string }): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.featureRequest.count({ where: { userId, createdAt: { gte: since } } });
  if (recent >= FEATURE_REQUESTS_PER_DAY) throw new FeatureError("rate_limited");

  await prisma.featureRequest.create({
    data: { id: newId("feat"), userId, title: input.title, description: input.description },
  });
}

/**
 * Sets whether `userId` likes a request. Takes the desired end state rather than toggling, so a
 * double-click or a retried request lands in the same place instead of flipping back.
 */
export async function setFeatureVote(userId: string, featureRequestId: string, liked: boolean): Promise<void> {
  if (!liked) {
    await prisma.featureVote.deleteMany({ where: { userId, featureRequestId } });
    return;
  }
  const exists = await prisma.featureRequest.findUnique({ where: { id: featureRequestId }, select: { id: true } });
  if (!exists) throw new FeatureError("not_found");
  await prisma.featureVote.upsert({
    where: { featureRequestId_userId: { featureRequestId, userId } },
    create: { featureRequestId, userId },
    update: {},
  });
}

export async function updateFeatureStatus(featureRequestId: string, status: FeatureStatus): Promise<void> {
  await prisma.featureRequest.update({ where: { id: featureRequestId }, data: { status } });
}

export async function deleteFeatureRequest(featureRequestId: string): Promise<void> {
  await prisma.featureRequest.deleteMany({ where: { id: featureRequestId } });
}
