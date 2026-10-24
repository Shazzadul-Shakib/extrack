import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LineChart, PiggyBank, TrendingUp, Wallet as WalletIcon } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserInvestmentEntries, getUserInvestments } from "@/lib/investmentData";
import { buildPortfolio, portfolioSeries, portfolioTotals } from "@/lib/investments";
import { todayIso } from "@/lib/format";
import { StatCard } from "@/components/dashboard/StatCard";
import { AllocationBars } from "@/components/investments/AllocationBars";
import { CreateInvestmentButton } from "@/components/investments/CreateInvestmentButton";
import { InvestmentCard } from "@/components/investments/InvestmentCard";
import { PortfolioChart } from "@/components/investments/PortfolioChart";
import { Card, EmptyState } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Investments" });
  return { title: `${t("pageTitle")} — Extrack` };
}

export default async function InvestmentsPage() {
  const user = await requireUser();
  const [t, locale, investments, entries] = await Promise.all([
    getTranslations("Investments"),
    getLocale(),
    getUserInvestments(user.id),
    getUserInvestmentEntries(user.id),
  ]);
  const today = todayIso();
  const items = buildPortfolio(investments, entries, today);
  const open = items.filter((i) => !i.investment.closedAt);
  const closed = items.filter((i) => i.investment.closedAt);
  const totals = portfolioTotals(items);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">{t("pageTitle")}</h2>
          <p className="text-[13px] text-text-muted">{t("pageDesc")}</p>
        </div>
        <CreateInvestmentButton />
      </div>

      {items.length === 0 ? (
        <EmptyState icon={LineChart} title={t("emptyTitle")} description={t("emptyDesc")} action={<CreateInvestmentButton label={t("addFirst")} />} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("currentValue")} value={totals.value} icon={LineChart} accent="brand" locale={locale} hint={t("openCount", { count: open.length })} />
            <StatCard label={t("invested")} value={totals.invested} icon={WalletIcon} accent="neutral" locale={locale} />
            <StatCard label={t("returnsReceived")} value={totals.returns} icon={PiggyBank} accent="good" locale={locale} />
            <StatCard label={t("totalGain")} value={totals.gain} icon={TrendingUp} accent={totals.gain >= 0 ? "good" : "critical"} locale={locale} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <Card className="p-5 lg:col-span-3">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">{t("growth")}</h3>
              <PortfolioChart data={portfolioSeries(items, today)} />
            </Card>
            <Card className="p-5 lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">{t("allocation")}</h3>
              <AllocationBars items={items} />
            </Card>
          </div>

          {open.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {open.map((item) => (
                <InvestmentCard key={item.investment.id} item={item} />
              ))}
            </div>
          )}

          {closed.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-text-primary">{t("closedSection")}</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {closed.map((item) => (
                  <InvestmentCard key={item.investment.id} item={item} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
