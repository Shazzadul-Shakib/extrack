import { createGoogleUser, findUserByEmail, findUserByGoogleId, linkGoogleAccount } from "./users";
import { createStarterWallets } from "./onboarding";
import type { GoogleProfile } from "./google";
import type { User } from "./types";

/**
 * Maps a Google profile onto an Extrack account: a returning Google user signs straight in,
 * a matching email address gets the Google identity linked to its existing account, and
 * anyone else gets a fresh account with the starter wallets. Returns null when the address
 * already belongs to an account tied to a *different* Google identity.
 *
 * The caller has already checked that Google reports the email as verified — that's what makes
 * linking by email safe.
 */
export async function resolveGoogleUser(profile: GoogleProfile): Promise<User | null> {
  const byGoogleId = await findUserByGoogleId(profile.sub);
  if (byGoogleId) return byGoogleId;

  const byEmail = await findUserByEmail(profile.email);
  if (byEmail) {
    if (byEmail.googleId && byEmail.googleId !== profile.sub) return null;
    return linkGoogleAccount(byEmail, profile.sub);
  }

  try {
    const user = await createGoogleUser({ name: profile.name, email: profile.email, googleId: profile.sub });
    await createStarterWallets(user.id);
    return user;
  } catch (error) {
    // Lost a race with a concurrent first sign-in (unique constraint on email / google id) — the account now exists.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return (await findUserByGoogleId(profile.sub)) ?? (await findUserByEmail(profile.email));
    }
    throw error;
  }
}
