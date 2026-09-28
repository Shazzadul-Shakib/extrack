import { createHash } from "node:crypto";

/** Cookie carrying the one-time state + PKCE verifier between the redirect to Google and the callback. */
export const OAUTH_COOKIE = "extrack_oauth";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

/** Google sign-in is optional: the button only appears once both credentials are configured. */
export function isGoogleAuthConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

/** The S256 PKCE challenge for a code verifier. */
export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function buildGoogleAuthUrl(input: { redirectUri: string; state: string; codeVerifier: string }): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: input.state,
    code_challenge: pkceChallenge(input.codeVerifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface GoogleProfile {
  /** Google's stable, unique account id. */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

/**
 * Trades the authorization `code` for the signed-in user's profile. Returns null on any failure
 * (bad or reused code, network error, malformed response) — the caller just sends the user back
 * to the login page with a generic error.
 */
export async function fetchGoogleProfile(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<GoogleProfile | null> {
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: input.code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri: input.redirectUri,
        grant_type: "authorization_code",
        code_verifier: input.codeVerifier,
      }),
    });
    if (!tokenRes.ok) {
      console.error("[google] token exchange failed:", tokenRes.status, (await tokenRes.text()).slice(0, 300));
      return null;
    }
    const { access_token: accessToken } = (await tokenRes.json()) as { access_token?: string };
    if (!accessToken) return null;

    const infoRes = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!infoRes.ok) return null;
    const info = (await infoRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };
    if (!info.sub || !info.email) return null;
    return {
      sub: info.sub,
      email: info.email,
      emailVerified: info.email_verified === true,
      name: info.name?.trim() || info.email.split("@")[0],
    };
  } catch (error) {
    console.error("[google] profile fetch failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
