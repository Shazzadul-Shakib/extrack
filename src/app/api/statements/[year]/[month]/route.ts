import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/session";
import { getMonthlyStatement } from "@/lib/statement";
import { registerStatementFonts } from "@/lib/pdf/fonts";
import { StatementDocument, type StatementLabels } from "@/lib/pdf/StatementDocument";
import type { WalletType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/statements/2026/10?locale=bn[&inline=1]
 *
 * Streams a month's statement as a PDF in the requested language. `inline=1` lets the preview
 * page show it in an iframe; without it the browser downloads it. Sits outside the locale-prefixed
 * routes (and the auth proxy skips /api), so it checks the session itself and takes the locale
 * as a query param.
 */
export async function GET(request: Request, { params }: { params: Promise<{ year: string; month: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { year: rawYear, month: rawMonth } = await params;
  const year = Number(rawYear);
  const month = Number(rawMonth);
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    return new Response("Invalid month", { status: 400 });
  }

  const url = new URL(request.url);
  const requestedLocale = url.searchParams.get("locale");
  const locale = hasLocale(routing.locales, requestedLocale) ? requestedLocale : routing.defaultLocale;
  const inline = url.searchParams.get("inline") === "1";

  const [statement, t, tCategories, tWalletTypes] = await Promise.all([
    getMonthlyStatement(user, year, month),
    getTranslations({ locale, namespace: "Statement" }),
    getTranslations({ locale, namespace: "Categories" }),
    getTranslations({ locale, namespace: "WalletTypes" }),
  ]);

  const labels: StatementLabels = {
    locale,
    t: (key, values) => t(key as never, values as never),
    // Custom or legacy categories may have no translation — show them as typed.
    category: (category) => (tCategories.has(category as never) ? tCategories(category as never) : category),
    walletType: (type: WalletType) => tWalletTypes(type),
  };

  registerStatementFonts();
  const pdf = await renderToBuffer(
    // renderToBuffer is typed for a bare <Document>; ours is a component that renders one.
    createElement(StatementDocument, { statement, labels }) as unknown as ReactElement<DocumentProps>,
  );

  const filename = `extrack-statement-${year}-${String(month).padStart(2, "0")}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
