import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Wallet as WalletIcon } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserWallets, getUserTransactions } from "@/lib/queries";
import { WalletCard } from "@/components/wallets/WalletCard";
import { CreateWalletButton } from "@/components/wallets/CreateWalletButton";
import { EmptyState } from "@/components/ui";
import { WALLET_TYPE_META } from "@/lib/categories";
import type { Wallet, WalletType } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Wallets" });
  return { title: `${t("pageTitle")} — Extrack` };
}

const SECTION_ORDER: WalletType[] = ["cash", "bank", "savings", "lend", "debt"];

export default async function WalletsPage() {
  const user = await requireUser();
  const [t, tWalletTypes] = await Promise.all([getTranslations("Wallets"), getTranslations("WalletTypes")]);
  const [wallets, transactions] = await Promise.all([getUserWallets(user.id), getUserTransactions(user.id)]);

  const countFor = (w: Wallet) => transactions.filter((t) => t.walletId === w.id || t.toWalletId === w.id).length;
  // Cleared debt wallets are auto-archived once paid off — they no longer belong on this page;
  // their history is still reachable from the Debts page.
  const visibleWallets = wallets.filter((w) => !w.archived);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">{t("pageTitle")}</h2>
          <p className="text-[13px] text-text-muted">{t("pageDesc")}</p>
        </div>
        <CreateWalletButton wallets={wallets} />
      </div>

      {visibleWallets.length === 0 ? (
        <EmptyState icon={WalletIcon} title={t("noWalletsTitle")} description={t("noWalletsDesc")} action={<CreateWalletButton label={t("createFirstWallet")} wallets={wallets} />} />
      ) : (
        SECTION_ORDER.map((type) => {
          const group = visibleWallets.filter((w) => w.type === type);
          if (group.length === 0) return null;
          const Icon = WALLET_TYPE_META[type].icon;
          return (
            <div key={type}>
              <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-text-muted">
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                {tWalletTypes(type)}
              </h3>
              <div className="flex flex-wrap gap-4">
                {group.map((w) => (
                  <WalletCard key={w.id} wallet={w} transactionCount={countFor(w)} className="sm:w-80" />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
