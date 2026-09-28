import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getAppUrl } from "@/lib/appUrl";
import { verifyToken } from "@/lib/crypto";
import { fetchGoogleProfile, isGoogleAuthConfigured, OAUTH_COOKIE } from "@/lib/google";
import { resolveGoogleUser } from "@/lib/googleAccount";
import { createSessionCookie } from "@/lib/session";
import { routing } from "@/i18n/routing";

interface OAuthCookie {
  state: string;
  codeVerifier: string;
  locale: string;
  exp: number;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Where Google sends the user back to: verifies the state, exchanges the code, and signs the user in. */
export async function GET(request: NextRequest) {
  const appUrl = await getAppUrl();
  const payload = verifyToken<OAuthCookie>(request.cookies.get(OAUTH_COOKIE)?.value, "oauth");
  const locale = routing.locales.find((l) => l === payload?.locale) ?? routing.defaultLocale;

  function finish(path: string) {
    const response = NextResponse.redirect(`${appUrl}/${locale}${path}`);
    // The state cookie is single-use, whatever the outcome.
    response.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });
    return response;
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!isGoogleAuthConfigured() || !payload || payload.exp < Date.now() || !code || !state || !safeEqual(state, payload.state)) {
    return finish("/login?error=google");
  }

  const profile = await fetchGoogleProfile({
    code,
    redirectUri: `${appUrl}/api/auth/google/callback`,
    codeVerifier: payload.codeVerifier,
  });
  // Linking by email is only safe when Google itself vouches for the address.
  if (!profile || !profile.emailVerified) return finish("/login?error=google");

  const user = await resolveGoogleUser(profile);
  if (!user) return finish("/login?error=google_conflict");

  await createSessionCookie(user.id);
  return finish("/dashboard");
}
