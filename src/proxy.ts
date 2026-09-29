import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { verifyToken } from "@/lib/crypto";

const handleI18nRouting = createMiddleware(routing);

const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];
const COOKIE_NAME = "extrack_session";

function hasValidSession(request: NextRequest): boolean {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const payload = verifyToken<{ userId: string; exp: number }>(token);
  return !!payload && payload.exp > Date.now();
}

/** Splits a locale-prefixed pathname like "/en/wallets" into its locale and the rest ("/wallets"). */
function splitLocale(pathname: string): { locale: string; rest: string } {
  const segments = pathname.split("/");
  const locale = segments[1] ?? routing.defaultLocale;
  const rest = "/" + segments.slice(2).join("/");
  return { locale, rest: rest.length > 1 ? rest.replace(/\/$/, "") : "/" };
}

export default function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);

  // The intl routing already wants to redirect (e.g. to add the locale
  // prefix) — let that happen first. Auth is checked once the URL is
  // locale-prefixed, on the request that follows.
  if (response.headers.get("location")) return response;

  const { locale, rest } = splitLocale(request.nextUrl.pathname);
  const isPublicRoute = PUBLIC_ROUTES.includes(rest) || rest === "/";
  const authed = hasValidSession(request);

  if (!authed && !isPublicRoute) {
    const url = new URL(`/${locale}/login`, request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (authed && (rest === "/login" || rest === "/signup")) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  // icon/apple-icon are generated routes with no file extension in their
  // served URL, so the default "skip anything with a dot" exclusion below
  // doesn't catch them — without this they'd get redirected to /en/icon
  // and 404, since there's no such route under [locale].
  matcher: ["/((?!api|_next|_vercel|icon|apple-icon|.*\\..*).*)"],
};
