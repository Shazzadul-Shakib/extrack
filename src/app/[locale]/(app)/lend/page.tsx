import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { HandCoins } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserWallets, getTransactionsPage } from "@/lib/queries";
import { parseFilters } from "@/lib/transactionFilters";
import { totalLend } from "@/lib/finance";
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
  const t = await getTranslations({ locale, namespace: "Lend" });
  return { title: `${t("pageTitle")} — Extrack` };
}

export default async function LendPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const [walletsWithDeleted, rawParams, t, tCommon, tWallets, locale] = await Promise.all([
    getUserWallets(user.id, { includeDeleted: true }),
    searchParams,
    getTranslations("Lend"),
    getTranslations("Common"),
    getTranslations("Wallets"),
    getLocale(),
  ]);
  // Soft-deleted wallets are kept only to resolve names and scope the history query
  // below — never for the wallet grid, totals, or pickers.
  const wallets = walletsWithDeleted.filter((w) => !w.deletedAt);

  // The grid only ever shows non-deleted, non-archived wallets, but history (and
  // whether to show it at all) has to reach further back: a lend wallet that's
  // since been fully repaid and deleted should still surface its past transactions here.
  const allLendWallets = wallets.filter((w) => w.type === "lend");
  const lendWallets = allLendWallets.filter((w) => !w.archived);
  const lendIds = walletsWithDeleted.filter((w) => w.type === "lend").map((w) => w.id);

  const filters = parseFilters(rawParams);
  const page =
    lendIds.length > 0
      ? await getTransactionsPage(user.id, filters, 0, { walletIds: lendIds })
      : { items: [], hasMore: false };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">{t("pageTitle")}</h2>
          <p className="text-[13px] text-text-muted">{t("pageDesc")}</p>
        </div>
        <CreateWalletButton label={t("addLendWallet")} wallets={wallets} defaultType="lend" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalLent")} value={totalLend(wallets)} icon={HandCoins} accent="good" locale={locale} hint={tCommon("walletCount", { count: lendWallets.length })} />
        {lendWallets.map((w) => (
          <WalletCard key={w.id} wallet={w} />
        ))}
      </div>

      {lendIds.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title={t("noLendWalletsTitle")}
          description={t("noLendWalletsDesc")}
          action={<CreateWalletButton label={t("createLendWallet")} wallets={wallets} defaultType="lend" />}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-text-primary">{t("history")}</h3>
            <AddTransactionButton wallets={wallets.filter((w) => !w.archived)} defaultWalletId={lendWallets[0]?.id} />
          </div>
          <FilterBar wallets={allLendWallets} showWalletFilter showTypeFilter={false} showCategoryFilter={false} />
          <TransactionList initialItems={page.items} initialHasMore={page.hasMore} wallets={walletsWithDeleted} scopeWalletIds={lendIds} />
        </>
      )}

      <p className="text-[12.5px] text-text-muted">
        {t.rich("tip", {
          expense: tCommon("kindExpense"),
          getRepaid: tWallets("getRepaid"),
          b: (chunks) => <span className="font-medium text-text-primary">{chunks}</span>,
        })}
      </p>
    </div>
  );
}
