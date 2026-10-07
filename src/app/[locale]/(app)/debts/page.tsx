import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CreditCard } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserWallets, getWalletHistoryPage } from "@/lib/queries";
import { parseFilters } from "@/lib/transactionFilters";
import { totalDebt } from "@/lib/finance";
import { StatCard } from "@/components/dashboard/StatCard";
import { WalletCard } from "@/components/wallets/WalletCard";
import { CreateWalletButton } from "@/components/wallets/CreateWalletButton";
import { FilterBar } from "@/components/transactions/FilterBar";
import { WalletHistory } from "@/components/wallets/WalletHistory";
import { EmptyState } from "@/components/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Debts" });
  return { title: `${t("pageTitle")} — Extrack` };
}

export default async function DebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const [walletsWithDeleted, rawParams, t, tCommon, tWallets, locale] = await Promise.all([
    getUserWallets(user.id, { includeDeleted: true }),
    searchParams,
    getTranslations("Debts"),
    getTranslations("Common"),
    getTranslations("Wallets"),
    getLocale(),
  ]);
  // Soft-deleted wallets are kept only to resolve names and scope the history query
  // below — never for the wallet grid, totals, or pickers.
  const wallets = walletsWithDeleted.filter((w) => !w.deletedAt);

  // The grid only ever shows non-deleted, non-archived wallets, but history (and
  // whether to show it at all) has to reach further back: a debt wallet that's
  // since been paid off and deleted should still surface its past transactions here.
  const allDebtWallets = wallets.filter((w) => w.type === "debt");
  const debtWallets = allDebtWallets.filter((w) => !w.archived);
  const debtIds = walletsWithDeleted.filter((w) => w.type === "debt").map((w) => w.id);

  const page = await getWalletHistoryPage(user.id, "debt", parseFilters(rawParams), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">{t("pageTitle")}</h2>
          <p className="text-[13px] text-text-muted">{t("pageDesc")}</p>
        </div>
        <CreateWalletButton label={t("addDebtWallet")} wallets={wallets} defaultType="debt" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalOwed")} value={totalDebt(wallets)} icon={CreditCard} accent="critical" locale={locale} hint={tCommon("walletCount", { count: debtWallets.length })} />
        {debtWallets.map((w) => (
          <WalletCard key={w.id} wallet={w} />
        ))}
      </div>

      {debtIds.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={t("noDebtWalletsTitle")}
          description={t("noDebtWalletsDesc")}
          action={<CreateWalletButton label={t("createDebtWallet")} wallets={wallets} defaultType="debt" />}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-text-primary">{t("history")}</h3>
          </div>
          <FilterBar wallets={allDebtWallets} showWalletFilter showTypeFilter={false} showCategoryFilter={false} />
          <WalletHistory type="debt" initialItems={page.items} initialHasMore={page.hasMore} balanceLabel={t("balanceColumn")} />
        </>
      )}

      <p className="text-[12.5px] text-text-muted">
        {t.rich("tip", {
          clearDebt: tWallets("clearDebt"),
          b: (chunks) => <span className="font-medium text-text-primary">{chunks}</span>,
        })}
      </p>
    </div>
  );
}
