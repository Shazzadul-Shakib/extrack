import { NextResponse, type NextRequest } from "next/server";
import { getAppUrl } from "@/lib/appUrl";
import { randomToken, signToken } from "@/lib/crypto";
import { buildGoogleAuthUrl, isGoogleAuthConfigured, OAUTH_COOKIE } from "@/lib/google";
import { routing } from "@/i18n/routing";

const OAUTH_TTL_SECONDS = 10 * 60;

/** Kicks off "Continue with Google": stashes a one-time state + PKCE verifier in a signed cookie, then bounces to Google. */
export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("locale") ?? "";
  const locale = routing.locales.find((l) => l === requested) ?? routing.defaultLocale;
  const appUrl = await getAppUrl();

  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(`${appUrl}/${locale}/login?error=google_unavailable`);
  }

  const state = randomToken();
  const codeVerifier = randomToken(48);
  const cookie = signToken({ state, codeVerifier, locale, exp: Date.now() + OAUTH_TTL_SECONDS * 1000 }, "oauth");

  const response = NextResponse.redirect(
    buildGoogleAuthUrl({ redirectUri: `${appUrl}/api/auth/google/callback`, state, codeVerifier })
  );
  response.cookies.set(OAUTH_COOKIE, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // the return trip from Google is a top-level GET, which lax still sends
    path: "/api/auth/google",
    maxAge: OAUTH_TTL_SECONDS,
  });
  return response;
}
