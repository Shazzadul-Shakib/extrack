"use client";

import { useActionState, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import {
  createWalletAction,
  type WalletFormState,
} from "@/app/actions/wallets";
import { Button, Field, Input, Select } from "@/components/ui";
import { WALLET_TYPE_META } from "@/lib/categories";
import { formatCurrency, walletBalanceLabel } from "@/lib/format";
import type { Wallet, WalletType } from "@/lib/types";

const initialState: WalletFormState = {};
const TYPES = Object.keys(WALLET_TYPE_META) as WalletType[];

export function WalletForm({
  wallets = [],
  defaultType = "cash",
  onSuccess,
}: {
  wallets?: Wallet[];
  defaultType?: WalletType;
  onSuccess?: () => void;
}) {
  const t = useTranslations("Wallets");
  const tCommon = useTranslations("Common");
  const tWalletTypes = useTranslations("WalletTypes");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    createWalletAction,
    initialState,
  );
  const [type, setType] = useState<WalletType>(defaultType);
  const [balance, setBalance] = useState("0");
  const [fundingWalletId, setFundingWalletId] = useState("");

  useEffect(() => {
    if (state.success) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  const fundingCandidates = wallets.filter((w) => !w.archived && w.type !== "debt" && w.type !== "lend");
  const fundingWallet = fundingCandidates.find((w) => w.id === fundingWalletId);
  const balanceNum = Number(balance);
  const insufficientFunds = !!fundingWallet && balanceNum > 0 && balanceNum > fundingWallet.balance;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <Field label={t("walletName")} htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" placeholder={t("walletNamePlaceholder")} required />
      </Field>
      <Field label={t("type")} htmlFor="type" error={state.fieldErrors?.type}>
        <Select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as WalletType)}
          required
        >
          {TYPES.map((wt) => (
            <option key={wt} value={wt}>
              {tWalletTypes(wt)}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label={t("startingBalance")}
        htmlFor="balance"
        error={
          state.fieldErrors?.balance ??
          (insufficientFunds
            ? t("onlyAvailable", { amount: formatCurrency(fundingWallet!.balance, fundingWallet!.currency, locale), name: fundingWallet!.name })
            : undefined)
        }
      >
        <Input
          id="balance"
          name="balance"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
        />
      </Field>
      {type !== "debt" && type !== "lend" && !fundingWalletId && balanceNum > 0 && (
        <p className="-mt-2 text-[12.5px] text-text-muted">
          {t("recordedAsIncome")}
        </p>
      )}
      {(type === "savings" || type === "lend") && fundingCandidates.length > 0 && (
        <>
          <Field label={t("fundFromWallet")} htmlFor="fundingWalletId">
            <Select
              id="fundingWalletId"
              name="fundingWalletId"
              value={fundingWalletId}
              onChange={(e) => setFundingWalletId(e.target.value)}
            >
              <option value="">{t("dontMoveMoney")}</option>
              {fundingCandidates.map((w) => (
                <option key={w.id} value={w.id}>{`${w.name} (${walletBalanceLabel(w, t, locale)})`}</option>
              ))}
            </Select>
          </Field>
          <p className="-mt-2 text-[12.5px] text-text-muted">
            {t("fundingMovesBalance")}
          </p>
        </>
      )}
      <Field label={tCommon("noteOptional")} htmlFor="note">
        <Input
          id="note"
          name="note"
          placeholder={t("walletNotePlaceholder")}
          maxLength={140}
        />
      </Field>
      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          {state.error}
        </p>
      )}
      <Button type="submit" loading={pending} disabled={insufficientFunds} className="mt-1 w-full">
        {pending ? t("creatingWallet") : t("createWallet")}
      </Button>
    </form>
  );
}
