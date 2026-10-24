import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { getUserTransactions, getUserWallets } from "@/lib/queries";
import { isIncome, netWorth, sumBy, totalSavings } from "@/lib/finance";
import { currentIncomeYearStart, incomeYearRange } from "@/lib/tax/calculate";
import { TaxEstimator } from "@/components/tax/TaxEstimator";
import { getUserInvestmentEntries, getUserInvestments } from "@/lib/investmentData";
import { buildPortfolio, investmentTaxFigures, netWorthAdjustment } from "@/lib/investments";
import { todayIso } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Tax" });
  return { title: `${t("pageTitle")} — Extrack` };
}

// Each income category feeds its own field. Gifts aren't taxable income, so they're left out;
// the user can still add anything missing in the form.

export default async function TaxPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const [t, locale, params] = await Promise.all([getTranslations("Tax"), getLocale(), searchParams]);
  const startYear = Number(params.year) || currentIncomeYearStart();
  const { start, end } = incomeYearRange(startYear);

  const [wallets, transactions, investments, investmentEntries] = await Promise.all([
    getUserWallets(user.id),
    getUserTransactions(user.id),
    getUserInvestments(user.id),
    getUserInvestmentEntries(user.id),
  ]);
  const portfolio = buildPortfolio(investments, investmentEntries, todayIso());
  const figures = investmentTaxFigures(portfolio, start, end);
  // Money an investment entry moved through a wallet is also a transaction; the investment
  // figures below already cover it, so those rows are left out here to avoid counting twice.
  const income = transactions.filter((tx) => isIncome(tx) && !tx.investmentId && tx.date >= start && tx.date <= end);
  const sumFor = (category: string) => sumBy(income.filter((tx) => tx.category === category), (tx) => tx.amount);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-text-primary">{t("pageTitle")}</h2>
        <p className="text-[13px] text-text-muted">{t("pageDesc")}</p>
      </div>
      <TaxEstimator
        key={startYear}
        startYear={startYear}
        locale={locale}
        initialIncome={{
          salary: sumFor("Salary"),
          business: sumFor("Business") + figures.businessReturns,
          freelance: sumFor("Freelance"),
          investment: sumFor("Investment") + figures.investmentReturns,
          other: sumFor("Other"),
        }}
        initialRebate={figures.rebate}
        taxedAtSourceReturns={figures.taxedAtSourceReturns}
        investmentsAdjustment={netWorthAdjustment(portfolio)}
        trackedNetWorth={netWorth(wallets)}
        savingsBalance={totalSavings(wallets)}
      />
    </div>
  );
}
