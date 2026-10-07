import { getLocale, getTranslations } from "next-intl/server";
import { PiggyBank, TrendingDown, TrendingUp, Wallet as WalletIcon } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui";
import { cx } from "@/components/cx";
import { formatCompactNumber, formatCurrency, formatNumber, getShortMonthNames } from "@/lib/format";
import type { YearlyLoanSummary, YearlyStatement } from "@/lib/yearStatement";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="border-b border-border px-4 py-3 text-sm font-semibold text-text-primary">{children}</h3>;
}

function Loan({
  title,
  data,
  labels,
  money,
}: {
  title: string;
  data: YearlyLoanSummary;
  labels: [string, string, string, string];
  money: (n: number) => string;
}) {
  const values = [data.opening, data.increased, data.decreased, data.closing];
  return (
    <Card className="overflow-hidden">
      <SectionTitle>{title}</SectionTitle>
      <dl className="divide-y divide-border">
        {labels.map((label, i) => (
          <div key={label} className="flex items-center justify-between px-4 py-2 text-[13px]">
            <dt className="text-text-secondary">{label}</dt>
            <dd className={cx("tabular-nums", i === 3 ? "font-semibold text-text-primary" : "text-text-primary")}>
              {money(values[i])}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

const th = "whitespace-nowrap px-3 py-2 text-right text-[12px] font-medium text-text-muted";
const td = "whitespace-nowrap px-3 py-2 text-right text-[13px] tabular-nums";

/** Compact year-in-review: monthly totals, expenses by month and category, income sources, savings, debt and lend. */
export async function YearlyStatementView({ statement }: { statement: YearlyStatement }) {
  const [t, tCategories, locale] = await Promise.all([
    getTranslations("YearView"),
    getTranslations("Categories"),
    getLocale(),
  ]);
  const money = (n: number) => formatCurrency(n, "BDT", locale);
  const compact = (n: number) => (n === 0 ? "—" : formatCompactNumber(Math.round(n), locale));
  const monthNames = getShortMonthNames(locale);
  const cat = (c: string) => (tCategories.has(c as never) ? tCategories(c as never) : c);
  const { summary } = statement;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("earnedThisYear")} value={summary.income} icon={TrendingUp} accent="good" locale={locale} />
        <StatCard label={t("spentThisYear")} value={summary.expense} icon={TrendingDown} accent="critical" locale={locale} />
        <StatCard label={t("savedThisYear")} value={summary.saved} icon={PiggyBank} accent="brand" locale={locale} />
        <StatCard
          label={t("leftOver")}
          value={summary.net}
          icon={WalletIcon}
          accent="neutral"
          locale={locale}
          hint={t("transactionCount", { count: formatNumber(summary.transactionCount, locale) })}
        />
      </div>

      <Card className="overflow-hidden">
        <SectionTitle>{t("monthByMonth")}</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-border">
                <th className={cx(th, "text-left")}>{t("month")}</th>
                <th className={th}>{t("income")}</th>
                <th className={th}>{t("expense")}</th>
                <th className={th}>{t("saved")}</th>
                <th className={th}>{t("leftOver")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {statement.months.map((m, i) => (
                <tr key={m.month}>
                  <td className="px-3 py-2 text-left text-[13px] text-text-secondary">{monthNames[i]}</td>
                  <td className={cx(td, "text-text-primary")}>{compact(m.income)}</td>
                  <td className={cx(td, "text-text-primary")}>{compact(m.expense)}</td>
                  <td className={cx(td, "text-text-primary")}>{compact(m.saved)}</td>
                  <td className={cx(td, m.net < 0 ? "text-status-critical" : "text-text-primary")}>{compact(m.net)}</td>
                </tr>
              ))}
              <tr className="bg-surface-2 font-semibold">
                <td className="px-3 py-2 text-left text-[13px] text-text-primary">{t("total")}</td>
                <td className={cx(td, "text-text-primary")}>{money(summary.income)}</td>
                <td className={cx(td, "text-text-primary")}>{money(summary.expense)}</td>
                <td className={cx(td, "text-text-primary")}>{money(summary.saved)}</td>
                <td className={cx(td, summary.net < 0 ? "text-status-critical" : "text-text-primary")}>{money(summary.net)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <SectionTitle>{t("expenseMatrix")}</SectionTitle>
        {statement.expenseMatrix.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-text-muted">{t("noExpenses")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border">
                  <th className={cx(th, "sticky left-0 bg-surface text-left")}>{t("category")}</th>
                  {monthNames.map((n) => (
                    <th key={n} className={th}>
                      {n}
                    </th>
                  ))}
                  <th className={th}>{t("total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {statement.expenseMatrix.map((row) => (
                  <tr key={row.category}>
                    <td className="sticky left-0 bg-surface px-3 py-2 text-left text-[13px] text-text-secondary">{cat(row.category)}</td>
                    {row.months.map((v, i) => (
                      <td key={i} className={cx(td, v === 0 ? "text-text-muted" : "text-text-primary")}>
                        {compact(v)}
                      </td>
                    ))}
                    <td className={cx(td, "font-semibold text-text-primary")}>{compact(row.total)}</td>
                  </tr>
                ))}
                <tr className="bg-surface-2 font-semibold">
                  <td className="sticky left-0 bg-surface-2 px-3 py-2 text-left text-[13px] text-text-primary">{t("total")}</td>
                  {statement.months.map((m) => (
                    <td key={m.month} className={cx(td, "text-text-primary")}>
                      {compact(m.expense)}
                    </td>
                  ))}
                  <td className={cx(td, "text-text-primary")}>{compact(summary.expense)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <SectionTitle>{t("incomeSources")}</SectionTitle>
          {statement.incomeByCategory.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-text-muted">{t("noIncome")}</p>
          ) : (
            <dl className="divide-y divide-border">
              {statement.incomeByCategory.map((c) => (
                <div key={c.category} className="flex items-center justify-between px-4 py-2 text-[13px]">
                  <dt className="text-text-secondary">{cat(c.category)}</dt>
                  <dd className="tabular-nums text-text-primary">{money(c.amount)}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
        <Card className="overflow-hidden">
          <SectionTitle>{t("cashAndBank")}</SectionTitle>
          <dl className="divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-2 text-[13px]">
              <dt className="text-text-secondary">{t("startOfYear")}</dt>
              <dd className="tabular-nums text-text-primary">{money(summary.liquidOpening)}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-2 text-[13px]">
              <dt className="text-text-secondary">{t("endOfYear")}</dt>
              <dd className="tabular-nums font-semibold text-text-primary">{money(summary.liquidClosing)}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-2 text-[13px]">
              <dt className="text-text-secondary">{t("savedThisYear")}</dt>
              <dd className="tabular-nums text-text-primary">{money(summary.saved)}</dd>
            </div>
          </dl>
        </Card>
        <Loan title={t("debtTitle")} data={statement.debt} money={money} labels={[t("openingBalance"), t("borrowed"), t("paidDown"), t("closingBalance")]} />
        <Loan title={t("lendTitle")} data={statement.lend} money={money} labels={[t("openingBalance"), t("lent"), t("paidBack"), t("closingBalance")]} />
      </div>
    </>
  );
}
