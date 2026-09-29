"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { cx } from "@/components/cx";
import { TransactionForm } from "./TransactionForm";
import { ReceiptScanFlow } from "./ReceiptScanFlow";
import type { Wallet } from "@/lib/types";

type Tab = "manual" | "scan";

export function AddTransactionButton({
  wallets,
  defaultWalletId,
  label,
  variant = "primary",
  className,
}: {
  wallets: Wallet[];
  defaultWalletId?: string;
  label?: string;
  variant?: "primary" | "secondary" | "outline";
  className?: string;
}) {
  const t = useTranslations("Transactions");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("manual");

  if (wallets.length === 0) return null;

  function handleOpen(open: boolean) {
    setOpen(open);
    if (!open) setTab("manual");
  }

  return (
    <>
      <Button variant={variant} className={className} onClick={() => handleOpen(true)}>
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        {label ?? t("addTransaction")}
      </Button>
      <Modal open={open} onClose={() => handleOpen(false)} title={tab === "manual" ? t("newTransaction") : t("scanReceiptTitle")}>
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
          {(["manual", "scan"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cx(
                "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                tab === value ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {value === "manual" ? t("tabManual") : t("tabScan")}
            </button>
          ))}
        </div>
        {tab === "manual" ? (
          <TransactionForm wallets={wallets} defaultWalletId={defaultWalletId} onSuccess={() => handleOpen(false)} />
        ) : (
          <ReceiptScanFlow wallets={wallets} defaultWalletId={defaultWalletId} onSuccess={() => handleOpen(false)} />
        )}
      </Modal>
    </>
  );
}
