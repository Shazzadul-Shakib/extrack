import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { getUserTransactions, getUserWallets } from "@/lib/queries";
import { isIncome, netWorth, sumBy, totalSavings } from "@/lib/finance";
import { currentIncomeYearStart, incomeYearRange } from "@/lib/tax/calculate";
import { TaxEstimator } from "@/components/tax/TaxEstimator";

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

  const [wallets, transactions] = await Promise.all([getUserWallets(user.id), getUserTransactions(user.id)]);
  const income = transactions.filter((tx) => isIncome(tx) && tx.date >= start && tx.date <= end);
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
          business: sumFor("Business"),
          freelance: sumFor("Freelance"),
          investment: sumFor("Investment"),
          other: sumFor("Other"),
        }}
        trackedNetWorth={netWorth(wallets)}
        savingsBalance={totalSavings(wallets)}
      />
    </div>
  );
}
