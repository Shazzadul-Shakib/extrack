import { getLocale, getTranslations } from "next-intl/server";
import { INVESTMENT_TYPE_META } from "@/lib/investmentTypes";
import { formatCurrency } from "@/lib/format";
import type { InvestmentType, PortfolioItem } from "@/lib/investments";

/** Current value of the open investments, grouped by type, largest first. */
export async function AllocationBars({ items }: { items: PortfolioItem[] }) {
  const [t, locale] = await Promise.all([getTranslations("Investments"), getLocale()]);
  const byType = new Map<InvestmentType, number>();
  for (const { investment, summary } of items) {
    if (investment.closedAt) continue;
    byType.set(investment.type, (byType.get(investment.type) ?? 0) + summary.value);
  }
  const rows = [...byType.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) return <p className="text-[13px] text-text-muted">{t("noAllocation")}</p>;
  const max = Math.max(...rows.map(([, v]) => v));

  return (
    <div className="flex flex-col gap-3">
      {rows.map(([type, value]) => {
        const meta = INVESTMENT_TYPE_META[type];
        const Icon = meta.icon;
        return (
          <div key={type} className="flex items-center gap-3">
            <div className="flex w-32 shrink-0 items-center gap-1.5 text-[13px] text-text-secondary">
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
              <span className="truncate">{t(`type.${type}`)}</span>
            </div>
            <div className="relative h-6 flex-1 rounded-full bg-surface-2">
              <div className="h-6 rounded-full transition-[width] duration-500 ease-out" style={{ width: `${Math.max((value / max) * 100, 3)}%`, background: `var(--series-${meta.slot})` }} />
            </div>
            <div className="w-21 shrink-0 text-right text-[13px] font-medium tabular-nums text-text-primary">{formatCurrency(value, "BDT", locale)}</div>
          </div>
        );
      })}
    </div>
  );
}
