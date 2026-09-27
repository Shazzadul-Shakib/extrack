import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PiggyBank } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserWallets, getTransactionsPage } from "@/lib/queries";
import { parseFilters } from "@/lib/transactionFilters";
import { totalSavings } from "@/lib/finance";
import { StatCard } from "@/components/dashboard/StatCard";
import { WalletCard } from "@/components/wallets/WalletCard";
import { CreateWalletButton } from "@/components/wallets/CreateWalletButton";
import { FilterBar } from "@/components/transactions/FilterBar";
import { TransactionList } from "@/components/transactions/TransactionList";
import { AddTransactionButton } from "@/components/transactions/AddTransactionButton";
import { EmptyState } from "@/components/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Savings" });
  return { title: `${t("pageTitle")} — Extrack` };
}

export default async function SavingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const [walletsWithDeleted, rawParams, t, tCommon, locale] = await Promise.all([
    getUserWallets(user.id, { includeDeleted: true }),
    searchParams,
    getTranslations("Savings"),
    getTranslations("Common"),
    getLocale(),
  ]);
  // Soft-deleted wallets are kept only to resolve names and scope the history query
  // below — never for the wallet grid, totals, or pickers.
  const wallets = walletsWithDeleted.filter((w) => !w.deletedAt);

  // The grid only ever shows non-deleted, non-archived wallets, but history (and
  // whether to show it at all) has to reach further back: a savings wallet that's
  // since been emptied and deleted should still surface its past transactions here.
  const allSavingsWallets = wallets.filter((w) => w.type === "savings");
  const savingsWallets = allSavingsWallets.filter((w) => !w.archived);
  const savingsIds = walletsWithDeleted.filter((w) => w.type === "savings").map((w) => w.id);

  const filters = parseFilters(rawParams);
  const page =
    savingsIds.length > 0
      ? await getTransactionsPage(user.id, filters, 0, { walletIds: savingsIds })
      : { items: [], hasMore: false };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">{t("pageTitle")}</h2>
          <p className="text-[13px] text-text-muted">{t("pageDesc")}</p>
        </div>
        <CreateWalletButton label={t("addSavingsWallet")} wallets={wallets} defaultType="savings" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalSavings")} value={totalSavings(wallets)} icon={PiggyBank} accent="good" locale={locale} hint={tCommon("walletCount", { count: savingsWallets.length })} />
        {savingsWallets.map((w) => (
          <WalletCard key={w.id} wallet={w} />
        ))}
      </div>

      {savingsIds.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title={t("noSavingsWalletsTitle")}
          description={t("noSavingsWalletsDesc")}
          action={<CreateWalletButton label={t("createSavingsWallet")} wallets={wallets} defaultType="savings" />}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-text-primary">{t("history")}</h3>
            <AddTransactionButton wallets={wallets.filter((w) => !w.archived)} defaultWalletId={savingsWallets[0]?.id} />
          </div>
          <FilterBar wallets={allSavingsWallets} showWalletFilter showTypeFilter={false} showCategoryFilter={false} />
          <TransactionList initialItems={page.items} initialHasMore={page.hasMore} wallets={walletsWithDeleted} scopeWalletIds={savingsIds} />
        </>
      )}

      <p className="text-[12.5px] text-text-muted">
        {t.rich("tip", {
          transfer: tCommon("kindTransfer"),
          b: (chunks) => <span className="font-medium text-text-primary">{chunks}</span>,
        })}
      </p>
    </div>
  );
}
