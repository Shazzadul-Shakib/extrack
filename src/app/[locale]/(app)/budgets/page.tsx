import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { getUserBudgets, getUserTransactions } from "@/lib/queries";
import { budgetProgress } from "@/lib/finance";
import { currentYearMonth, formatYear, monthLabel, monthLabelShort, shiftYearMonth } from "@/lib/format";
import { MonthYearPicker } from "@/components/dashboard/MonthYearPicker";
import { BudgetResults } from "@/components/budgets/BudgetResults";
import { CreateBudgetButton } from "@/components/budgets/CreateBudgetButton";
import { CopyBudgetButton } from "@/components/budgets/CopyBudgetButton";
import { CompareToggle } from "@/components/budgets/CompareToggle";
import { SwapMonthsButton } from "@/components/budgets/SwapMonthsButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Budgets" });
  return { title: `${t("pageTitle")} — Extrack` };
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const [t, tMonthYearPicker, locale] = await Promise.all([
    getTranslations("Budgets"),
    getTranslations("MonthYearPicker"),
    getLocale(),
  ]);
  const params = await searchParams;
  const defaults = currentYearMonth();
  const year = Number(params.year) || defaults.year;
  const month = Number(params.month) || defaults.month;

  const compare = params.compare === "1";
  const prevYM = shiftYearMonth(year, month, -1);
  const compareYear = Number(params.cy) || prevYM.year;
  const compareMonth = Number(params.cm) || prevYM.month;

  const [budgets, transactions] = await Promise.all([getUserBudgets(user.id), getUserTransactions(user.id)]);

  const baseRows = budgetProgress(transactions, budgets, year, month);
  const compareRows = compare ? budgetProgress(transactions, budgets, compareYear, compareMonth) : [];

  const baseLabel = `${monthLabel(month, locale)} ${formatYear(year, locale)}`;
  const compareLabel = `${monthLabel(compareMonth, locale)} ${formatYear(compareYear, locale)}`;
  const compareShort = `${monthLabelShort(compareMonth, locale)} ${formatYear(compareYear, locale)}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-text-primary">{t("pageTitle")}</h2>
            <p className="text-[13px] text-text-muted">
              {compare
                ? t("pageDescComparing", { base: baseLabel, compare: compareLabel })
                : t("pageDescDefault", { base: baseLabel })}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <MonthYearPicker year={year} month={month} className="w-full sm:w-auto" />
            <CopyBudgetButton
              key={`copy-budget-${year}-${month}`}
              budgets={budgets}
              year={year}
              month={month}
              className="w-full sm:w-auto"
            />
            <CreateBudgetButton
              budgets={budgets}
              defaultYear={year}
              defaultMonth={month}
              className="w-full sm:w-auto"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CompareToggle active={compare} baseYear={year} baseMonth={month} />
          {compare && (
            <div className="flex items-center gap-2">
              <SwapMonthsButton
                year={year}
                month={month}
                compareYear={compareYear}
                compareMonth={compareMonth}
              />
              <span className="text-[13px] text-text-muted">{t("vs")}</span>
              <MonthYearPicker
                year={compareYear}
                month={compareMonth}
                yearKey="cy"
                monthKey="cm"
                ariaPrefix={tMonthYearPicker("comparison")}
              />
            </div>
          )}
        </div>
      </div>

      <BudgetResults
        key={`${year}-${month}-${compare ? `${compareYear}-${compareMonth}` : "solo"}`}
        baseRows={baseRows}
        compareRows={compareRows}
        compare={compare}
        budgets={budgets}
        baseLabel={baseLabel}
        compareLabel={compareLabel}
        compareShort={compareShort}
      />
    </div>
  );
}
