import { cookies } from "next/headers";
import { cache } from "react";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { signToken, verifyToken } from "./crypto";
import { findUserById } from "./users";
import { isAdminUser } from "./roles";
import type { PublicUser } from "./types";

const COOKIE_NAME = "extrack_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface SessionPayload {
  userId: string;
  exp: number;
}

export async function createSessionCookie(userId: string) {
  const exp = Date.now() + SESSION_TTL_MS;
  const token = signToken({ userId, exp });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

async function readSessionPayload(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  const payload = verifyToken<SessionPayload>(token);
  if (!payload || payload.exp < Date.now()) return null;
  return payload;
}

/** Cached per-request: returns the logged-in user, or null. */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const payload = await readSessionPayload();
  if (!payload) return null;
  const user = await findUserById(payload.userId);
  // A session is only ever minted for a verified account; refusing an unverified one here keeps
  // that true even if a cookie outlives a change to the account.
  if (!user || !user.emailVerifiedAt) return null;
  // An explicit allow-list, so a field added to `User` later isn't handed to pages by default.
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    isAdmin: isAdminUser(user),
  };
});

/** Redirects to /login when there is no valid session. */
export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (user) return user;
  const locale = await getLocale();
  redirect({ href: "/login", locale });
  throw new Error("unreachable");
}

/**
 * For admin-only pages, actions and queries: returns the admin, or 404s for everyone else (a
 * signed-in non-admin gets the same "not found" as a URL that doesn't exist, so the admin area
 * doesn't advertise itself). Call it at the point the data is read or changed — a layout check
 * alone doesn't protect a route, since layouts aren't re-run on every navigation.
 */
export async function requireAdmin(): Promise<PublicUser> {
  const user = await requireUser();
  if (!user.isAdmin) notFound();
  return user;
}
