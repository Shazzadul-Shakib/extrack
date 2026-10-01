import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Download, ExternalLink, TrendingDown, TrendingUp, Wallet as WalletIcon } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getMonthlyStatement } from "@/lib/statement";
import { currentYearMonth, formatNumber, formatYear, monthLabel } from "@/lib/format";
import { StatCard } from "@/components/dashboard/StatCard";
import { MonthYearPicker } from "@/components/dashboard/MonthYearPicker";
import { Card } from "@/components/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Statement" });
  return { title: `${t("pageTitle")} — Extrack` };
}

const downloadClass =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-brand-contrast shadow-sm transition-colors duration-150 hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:w-auto";

export default async function StatementPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const [t, locale, params] = await Promise.all([getTranslations("Statement"), getLocale(), searchParams]);
  const defaults = currentYearMonth();
  const rawYear = Number(params.year);
  const rawMonth = Number(params.month);
  const year = Number.isInteger(rawYear) && rawYear >= 2000 && rawYear <= 2100 ? rawYear : defaults.year;
  const month = Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : defaults.month;

  const statement = await getMonthlyStatement(user, year, month);
  const { summary } = statement;

  const pdfPath = `/api/statements/${year}/${month}?locale=${locale}`;
  const period = `${monthLabel(month, locale)} ${formatYear(year, locale)}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">{t("pageTitle")}</h2>
          <p className="text-[13px] text-text-muted">{t("previewDesc", { period })}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <MonthYearPicker year={year} month={month} className="w-full sm:w-auto" />
          {/* A plain anchor, not the locale-aware Link: /api isn't under /[locale]. */}
          <a href={pdfPath} download className={downloadClass}>
            <Download className="h-4 w-4" strokeWidth={2} />
            {t("download")}
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("income")} value={summary.income} icon={TrendingUp} accent="good" locale={locale} />
        <StatCard label={t("expense")} value={summary.expense} icon={TrendingDown} accent="critical" locale={locale} />
        <StatCard
          label={t("net")}
          value={summary.net}
          icon={WalletIcon}
          accent="brand"
          locale={locale}
          hint={t("transactionCount", { count: formatNumber(summary.transactionCount, locale) })}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">{t("previewTitle")}</h3>
          <a
            href={`${pdfPath}&inline=1`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand hover:underline"
          >
            {t("openNewTab")}
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
          </a>
        </div>
        {/* Keyed so changing the month reloads the PDF. Some mobile browsers don't render PDFs inline — the link above covers them. */}
        <iframe
          key={`${year}-${month}-${locale}`}
          src={`${pdfPath}&inline=1#view=FitH`}
          title={t("previewFrameTitle", { period })}
          className="h-[75vh] min-h-120 w-full bg-surface-2"
        />
      </Card>
    </div>
  );
}
