"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { WalletForm } from "./WalletForm";
import { formatCurrency } from "@/lib/format";
import { pickDefaultCashWallet } from "@/lib/finance";
import type { Wallet, WalletType } from "@/lib/types";

export function CreateWalletButton({
  label,
  wallets = [],
  defaultType = "cash",
}: {
  label?: string;
  wallets?: Wallet[];
  defaultType?: WalletType;
}) {
  const t = useTranslations("Wallets");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<{ debtName: string; amount: number; currency: string } | null>(null);
  const cashName = pickDefaultCashWallet(wallets)?.name ?? "Cash";
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        {label ?? t("addWallet")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("newWallet")}>
        <WalletForm
          wallets={wallets}
          defaultType={defaultType}
          onSuccess={(result) => {
            setOpen(false);
            // A new debt wallet pays out into Cash behind the scenes — say so.
            if (result && result.wallet.type === "debt" && result.receivedAmount > 0) {
              setNotice({ debtName: result.wallet.name, amount: result.receivedAmount, currency: result.wallet.currency });
            }
          }}
        />
      </Modal>
      <Modal open={!!notice} onClose={() => setNotice(null)} title={t("debtMoneyMovedTitle")}>
        {notice && (
          <>
            <p className="text-sm text-text-secondary">
              {t.rich("debtMoneyMovedBody", {
                amount: formatCurrency(notice.amount, notice.currency, locale),
                debt: notice.debtName,
                cash: cashName,
                b: (chunks) => <span className="font-medium text-text-primary">{chunks}</span>,
              })}
            </p>
            <p className="mt-2 text-[13px] text-text-muted">{t("debtMoneyMovedHint")}</p>
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={() => setNotice(null)}>
                {t("gotIt")}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
