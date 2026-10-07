import { getLocale, getTranslations } from "next-intl/server";
import { PiggyBank, TrendingDown, TrendingUp, Wallet as WalletIcon } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { CategoryBarChart } from "@/components/dashboard/CategoryBarChart";
import { Card } from "@/components/ui";
import { formatYear } from "@/lib/format";
import type { TrendPoint } from "@/lib/finance";
import type { YearTotals } from "@/lib/yearly";

function pct(current: number, previous: number): number | undefined {
  if (previous === 0) return current === 0 ? undefined : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** The dashboard's yearly view: earned / spent / saved for the year, a month-by-month bar chart, and category spending. */
export async function YearlyDashboard({
  year,
  series,
  totals,
  previous,
  categories,
}: {
  year: number;
  series: TrendPoint[];
  totals: YearTotals;
  previous: YearTotals;
  categories: { category: string; amount: number }[];
}) {
  const [t, tDash, locale] = await Promise.all([getTranslations("YearView"), getTranslations("Dashboard"), getLocale()]);
  const deltaLabel = t("vsLastYear");

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t("earnedThisYear")}
          value={totals.income}
          icon={TrendingUp}
          accent="good"
          locale={locale}
          delta={pct(totals.income, previous.income)}
          deltaLabel={deltaLabel}
        />
        <StatCard
          label={t("spentThisYear")}
          value={totals.expense}
          icon={TrendingDown}
          accent="critical"
          locale={locale}
          delta={pct(totals.expense, previous.expense)}
          deltaGoodDirection="down"
          deltaLabel={deltaLabel}
        />
        <StatCard
          label={t("savedThisYear")}
          value={totals.saved}
          icon={PiggyBank}
          accent="brand"
          locale={locale}
          delta={pct(totals.saved, previous.saved)}
          deltaLabel={deltaLabel}
        />
        <StatCard
          label={t("leftOver")}
          value={totals.net}
          icon={WalletIcon}
          accent="neutral"
          locale={locale}
          hint={t("leftOverHint")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">{t("chartTitle")}</h3>
          <TrendChart data={series} />
        </Card>
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">{tDash("spendingByCategory")}</h3>
            <span className="text-[12.5px] text-text-muted">{formatYear(year, locale)}</span>
          </div>
          <CategoryBarChart data={categories} />
        </Card>
      </div>
    </>
  );
}
