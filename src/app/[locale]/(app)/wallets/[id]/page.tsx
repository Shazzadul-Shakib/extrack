import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { getInvestmentIdForWallet } from "@/lib/investmentData";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser, requireUser } from "@/lib/session";
import { getUserWallets, getWallet, getTransactionsPage, getWalletFlowTotals } from "@/lib/queries";
import { WALLET_TYPE_META } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import { parseFilters } from "@/lib/transactionFilters";
import { walletColor } from "@/components/wallets/WalletCard";
import { WalletDetailActions } from "@/components/wallets/WalletDetailActions";
import { AddTransactionButton } from "@/components/transactions/AddTransactionButton";
import { FilterBar } from "@/components/transactions/FilterBar";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Card } from "@/components/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const user = await getCurrentUser();
  const wallet = user ? await getWallet(user.id, id) : null;
  if (wallet) return { title: `${wallet.name} — Extrack` };
  const t = await getTranslations({ locale, namespace: "Wallets" });
  return { title: `${t("walletFallbackTitle")} — Extrack` };
}

export default async function WalletDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [wallet, allWallets, rawParams, t, tWalletTypes, tCommon, locale] = await Promise.all([
    getWallet(user.id, id),
    getUserWallets(user.id),
    searchParams,
    getTranslations("Wallets"),
    getTranslations("WalletTypes"),
    getTranslations("Common"),
    getLocale(),
  ]);

  if (!wallet) notFound();
  // An investment wallet is run from its investment, not from a wallet page.
  if (wallet.type === "investment") {
    const investmentId = await getInvestmentIdForWallet(user.id, wallet.id);
    if (investmentId) redirect({ href: `/investments/${investmentId}`, locale });
  }

  const filters = parseFilters(rawParams);
  const [page, flowTotals] = await Promise.all([
    getTransactionsPage(user.id, filters, 0, { walletIds: [wallet.id] }),
    getWalletFlowTotals(user.id, wallet.id),
  ]);
  const meta = WALLET_TYPE_META[wallet.type];
  const Icon = meta.icon;
  const color = walletColor(wallet);
  const { inflow, outflow } = flowTotals;

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
            >
              <Icon className="h-6 w-6" strokeWidth={2} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-text-primary">{wallet.name}</h2>
                <span
                  className="rounded-full px-2 py-0.5 text-[11.5px] font-medium"
                  style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
                >
                  {tWalletTypes(wallet.type)}
                </span>
                {wallet.archived && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-medium text-text-muted">
                    {tCommon("archived")}
                  </span>
                )}
              </div>
              {wallet.note && <p className="mt-0.5 text-[13px] text-text-muted">{wallet.note}</p>}
              <p className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
                {formatCurrency(wallet.balance, wallet.currency, locale)}
              </p>
            </div>
          </div>
          <WalletDetailActions wallet={wallet} wallets={allWallets} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:w-72">
          <div>
            <p className="text-[12px] uppercase tracking-wide text-text-muted">{t("totalIn")}</p>
            <p className="text-[15px] font-semibold text-status-good">+{formatCurrency(inflow, wallet.currency, locale)}</p>
          </div>
          <div>
            <p className="text-[12px] uppercase tracking-wide text-text-muted">{t("totalOut")}</p>
            <p className="text-[15px] font-semibold text-status-critical">-{formatCurrency(outflow, wallet.currency, locale)}</p>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{t("history")}</h3>
        <AddTransactionButton wallets={allWallets} defaultWalletId={wallet.id} />
      </div>

      <FilterBar />
      <TransactionList initialItems={page.items} initialHasMore={page.hasMore} wallets={allWallets} scopeWalletIds={[wallet.id]} />
    </div>
  );
}
