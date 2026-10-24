import { getLocale, getTranslations } from "next-intl/server";
import { LineChart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { StatCard } from "@/components/dashboard/StatCard";
import { PortfolioChart } from "@/components/investments/PortfolioChart";
import { Card } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { portfolioSeries, portfolioTotals, type PortfolioItem } from "@/lib/investments";

/** The dashboard's investments card and growth chart. Renders nothing until there is something to show. */
export async function DashboardInvestments({ items, today }: { items: PortfolioItem[]; today: string }) {
  if (items.length === 0) return null;
  const [t, tCommon, locale] = await Promise.all([getTranslations("Investments"), getTranslations("Common"), getLocale()]);
  const totals = portfolioTotals(items);
  const openCount = items.filter((i) => !i.investment.closedAt).length;

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-sm font-semibold text-text-primary">{t("pageTitle")}</h3>
        <Link href="/investments" className="text-[13px] font-medium text-brand hover:underline">
          {tCommon("viewAll")} →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* The grid stretches this column to the chart card's height; each stat card shares it. */}
        <div className="flex flex-col gap-4 lg:col-span-2 [&>*]:flex-1">
          <StatCard
            label={t("currentValue")}
            value={totals.value}
            icon={LineChart}
            accent="brand"
            locale={locale}
            delta={totals.gainRate * 100}
            deltaLabel={t("returnSoFar")}
            hint={t("openCount", { count: openCount })}
          />
          <StatCard label={t("invested")} value={totals.invested} icon={LineChart} accent="neutral" locale={locale} hint={t("gainLine", { gain: formatCurrency(totals.gain, "BDT", locale) })} />
        </div>
        <Card className="p-5 lg:col-span-3">
          <PortfolioChart data={portfolioSeries(items, today)} />
        </Card>
      </div>
    </div>
  );
}
