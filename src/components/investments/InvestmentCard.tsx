import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { cx } from "@/components/cx";
import { INVESTMENT_TYPE_META } from "@/lib/investmentTypes";
import { formatCurrency } from "@/lib/format";
import type { PortfolioItem } from "@/lib/investments";

export async function InvestmentCard({ item }: { item: PortfolioItem }) {
  const [t, locale] = await Promise.all([getTranslations("Investments"), getLocale()]);
  const { investment: inv, summary } = item;
  const meta = INVESTMENT_TYPE_META[inv.type];
  const Icon = meta.icon;
  const color = `var(--series-${meta.slot})`;
  const closed = !!inv.closedAt;
  const up = summary.gain >= 0;

  return (
    <Link
      href={`/investments/${inv.id}`}
      className="group flex w-full flex-col gap-4 rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-md"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="flex items-center gap-1.5">
          {closed && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-medium text-text-muted">{t("closed")}</span>}
          <span className="rounded-full px-2 py-0.5 text-[11.5px] font-medium" style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}>
            {t(`type.${inv.type}`)}
          </span>
        </div>
      </div>
      <div>
        <p className="truncate text-sm font-medium text-text-primary">{inv.name}</p>
        {inv.institution && <p className="truncate text-[12.5px] text-text-muted">{inv.institution}</p>}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[12px] text-text-muted">{closed ? t("finalGain") : t("currentValue")}</p>
          <p className="text-xl font-semibold tracking-tight text-text-primary tabular-nums">
            {formatCurrency(closed ? summary.gain : summary.value, "BDT", locale)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-text-muted">{t("investedLabel", { amount: formatCurrency(closed ? summary.contributed : summary.invested, "BDT", locale) })}</p>
          {summary.contributed > 0 && (
            <p className={cx("text-[12.5px] font-medium tabular-nums", up ? "text-status-good" : "text-status-critical")}>
              {up ? "+" : "−"}
              {new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US", { maximumFractionDigits: 1 }).format(Math.abs(summary.gainRate) * 100)}%
            </p>
          )}
        </div>
      </div>
      <span className="inline-flex items-center gap-1 text-[12.5px] text-text-muted transition-colors group-hover:text-brand">
        {t("viewDetails")} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
    </Link>
  );
}
