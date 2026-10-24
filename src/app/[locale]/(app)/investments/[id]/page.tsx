import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, LineChart, PiggyBank, TrendingUp, Wallet as WalletIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/session";
import { getUserWallets } from "@/lib/queries";
import { getInvestment, getUserInvestmentEntries } from "@/lib/investmentData";
import { investmentValue, summarizeInvestment } from "@/lib/investments";
import { formatDate, todayIso } from "@/lib/format";
import { StatCard } from "@/components/dashboard/StatCard";
import { InvestmentDetailActions } from "@/components/investments/InvestmentDetailActions";
import { InvestmentTimeline } from "@/components/investments/InvestmentTimeline";
import { Badge, Card, EmptyState } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Investments" });
  return { title: `${t("pageTitle")} — Extrack` };
}

export default async function InvestmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [t, locale, investment, allEntries, wallets] = await Promise.all([
    getTranslations("Investments"),
    getLocale(),
    getInvestment(user.id, id),
    getUserInvestmentEntries(user.id),
    getUserWallets(user.id, { includeDeleted: true }),
  ]);
  if (!investment) notFound();

  const entries = allEntries.filter((e) => e.investmentId === id);
  const today = todayIso();
  const summary = summarizeInvestment(investment, entries, today);
  const closed = !!investment.closedAt;
  const newestFirst = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const walletNames = Object.fromEntries(wallets.map((w) => [w.id, w.name]));
  const estimated = !closed && !entries.some((e) => e.kind === "value_update") && investmentValue(investment, entries, today) !== summary.invested;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/investments" className="inline-flex w-fit items-center gap-1.5 text-[13px] text-text-muted hover:text-text-primary">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        {t("back")}
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-text-primary">{investment.name}</h2>
            <Badge variant="brand">{t(`type.${investment.type}`)}</Badge>
            {closed && <Badge>{t("closed")}</Badge>}
          </div>
          <p className="text-[13px] text-text-muted">
            {[
              investment.institution,
              t("startedOn", { date: formatDate(investment.startDate, locale) }),
              investment.maturityDate ? t("maturesOn", { date: formatDate(investment.maturityDate, locale) }) : null,
              investment.ratePercent ? t("ratePerYear", { rate: investment.ratePercent }) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {investment.note && <p className="mt-1 text-[13px] text-text-secondary">{investment.note}</p>}
        </div>
        <InvestmentDetailActions investment={investment} wallets={wallets.filter((w) => !w.deletedAt)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={closed ? t("finalValue") : t("currentValue")} value={summary.value} icon={LineChart} accent="brand" locale={locale} hint={estimated ? t("estimated") : undefined} />
        <StatCard label={t("invested")} value={closed ? summary.contributed : summary.invested} icon={WalletIcon} accent="neutral" locale={locale} />
        <StatCard label={t("returnsReceived")} value={summary.returns} icon={PiggyBank} accent="good" locale={locale} />
        <StatCard label={t("totalGain")} value={summary.gain} icon={TrendingUp} accent={summary.gain >= 0 ? "good" : "critical"} locale={locale} />
      </div>

      <Card className="p-5">
        <h3 className="mb-1 text-sm font-semibold text-text-primary">{t("history")}</h3>
        {newestFirst.length === 0 ? (
          <EmptyState icon={LineChart} title={t("noEntriesTitle")} description={t("noEntriesDesc")} />
        ) : (
          <InvestmentTimeline investmentId={id} entries={newestFirst} walletNames={walletNames} />
        )}
      </Card>
    </div>
  );
}
