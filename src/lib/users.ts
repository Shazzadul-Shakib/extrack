import { prisma } from "./db";
import { newId } from "./id";
import { hashPassword, verifyPassword } from "./crypto";
import type { User } from "./types";

type UserRow = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    passwordSalt: row.passwordSalt,
    googleId: row.googleId,
    emailVerifiedAt: row.emailVerifiedAt ? row.emailVerifiedAt.toISOString() : null,
    verificationSentAt: row.verificationSentAt ? row.verificationSentAt.toISOString() : null,
    resetPasswordSentAt: row.resetPasswordSentAt ? row.resetPasswordSentAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserById(id: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? mapUser(row) : null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  return row ? mapUser(row) : null;
}

export async function findUserByGoogleId(googleId: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { googleId } });
  return row ? mapUser(row) : null;
}

/**
 * Creates a password account. It starts *unverified* (`emailVerifiedAt: null`, written
 * explicitly — the column's default would mark it verified) and can't sign in until the
 * emailed link is followed.
 */
export async function createUser(input: { name: string; email: string; password: string }): Promise<User> {
  const { hash, salt } = hashPassword(input.password);
  try {
    const row = await prisma.user.create({
      data: {
        id: newId("usr"),
        name: input.name,
        email: normalizeEmail(input.email),
        passwordHash: hash,
        passwordSalt: salt,
        emailVerifiedAt: null,
      },
    });
    return mapUser(row);
  } catch (error) {
    // Prisma P2002 = unique constraint violation (the email column) — race-safe, unlike a pre-check.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new Error("An account with this email already exists.");
    }
    console.error("[createUser] failed:", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message.split("\n")[0] : String(error),
      code: (error as { code?: string })?.code,
    });
    throw error;
  }
}

/** Creates an account for a Google sign-in. Google has already verified the address, and there's no password. */
export async function createGoogleUser(input: { name: string; email: string; googleId: string }): Promise<User> {
  const row = await prisma.user.create({
    data: {
      id: newId("usr"),
      name: input.name,
      email: normalizeEmail(input.email),
      googleId: input.googleId,
      emailVerifiedAt: new Date(),
    },
  });
  return mapUser(row);
}

/**
 * Attaches a Google identity to an existing account whose email Google has just confirmed.
 * That also proves ownership of the address, so it verifies the account. If the account was
 * never verified, its password was set by whoever first typed this address into the signup
 * form — not necessarily its owner — so it's discarded; the owner can sign in with Google.
 */
export async function linkGoogleAccount(user: User, googleId: string): Promise<User> {
  const wasUnverified = !user.emailVerifiedAt;
  const row = await prisma.user.update({
    where: { id: user.id },
    data: {
      googleId,
      emailVerifiedAt: user.emailVerifiedAt ? undefined : new Date(),
      ...(wasUnverified ? { passwordHash: null, passwordSalt: null } : {}),
    },
  });
  return mapUser(row);
}

/**
 * A repeat signup for an address whose account was never verified: the newest signup wins,
 * so a stranger who typed someone's address in first can't lock them out of it.
 */
export async function resetUnverifiedUser(userId: string, input: { name: string; password: string }): Promise<User> {
  const { hash, salt } = hashPassword(input.password);
  const row = await prisma.user.update({
    where: { id: userId },
    data: { name: input.name, passwordHash: hash, passwordSalt: salt },
  });
  return mapUser(row);
}

export async function markEmailVerified(userId: string): Promise<User> {
  const row = await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return mapUser(row);
}

export async function markVerificationSent(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { verificationSentAt: new Date() } });
}

export async function markResetPasswordSent(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { resetPasswordSentAt: new Date() } });
}

/**
 * Sets a new password after a successful reset-link flow. Following the emailed link proves the
 * address is reachable — the same proof `linkGoogleAccount` relies on — so an unverified account
 * is verified at the same time instead of being left stuck.
 */
export async function resetPassword(user: User, newPassword: string): Promise<User> {
  const { hash, salt } = hashPassword(newPassword);
  const row = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hash,
      passwordSalt: salt,
      emailVerifiedAt: user.emailVerifiedAt ? undefined : new Date(),
    },
  });
  return mapUser(row);
}

export type AuthResult =
  | { status: "ok"; user: User }
  /** Unknown email or wrong password. */
  | { status: "invalid" }
  /** The account exists but has no password — it signs in with Google. */
  | { status: "google_only" }
  /** The password is right, but the email address hasn't been confirmed yet. */
  | { status: "unverified"; user: User };

export async function authenticate(email: string, password: string): Promise<AuthResult> {
  const user = await findUserByEmail(email);
  if (!user) return { status: "invalid" };
  if (!user.passwordHash || !user.passwordSalt) return { status: "google_only" };
  if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) return { status: "invalid" };
  if (!user.emailVerifiedAt) return { status: "unverified", user };
  return { status: "ok", user };
}
