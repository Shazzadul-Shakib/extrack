"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AlertCircle, CircleDollarSign, HandCoins, Pencil, Trash2 } from "lucide-react";
import {
  updateWalletAction,
  deleteWalletAction,
  type WalletFormState,
} from "@/app/actions/wallets";
import {
  createTransactionAction,
  type TransactionFormState,
} from "@/app/actions/transactions";
import { Button, Field, Input, Select } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { formatCurrency, todayIso, walletBalanceLabel } from "@/lib/format";
import { pickDefaultCashWallet } from "@/lib/finance";
import type { Wallet } from "@/lib/types";

const initialState: WalletFormState = {};
const initialClearState: TransactionFormState = {};

function EditWalletForm({
  wallet,
  isDefault,
  onSuccess,
}: {
  wallet: Wallet;
  isDefault: boolean;
  onSuccess: () => void;
}) {
  const t = useTranslations("Wallets");
  const tCommon = useTranslations("Common");
  const action = updateWalletAction.bind(null, wallet.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <Field
        label={t("walletName")}
        htmlFor="edit-name"
        error={state.fieldErrors?.name}
      >
        <Input id="edit-name" name="name" defaultValue={wallet.name} readOnly={isDefault} required />
      </Field>
      <Field label={tCommon("noteOptional")} htmlFor="edit-note">
        <Input
          id="edit-note"
          name="note"
          defaultValue={wallet.note}
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
      <Button type="submit" loading={pending} className="mt-1 self-end">
        {pending ? tCommon("saving") : tCommon("saveChanges")}
      </Button>
    </form>
  );
}

function ClearDebtForm({
  wallet,
  wallets,
  onSuccess,
}: {
  wallet: Wallet;
  wallets: Wallet[];
  onSuccess: () => void;
}) {
  const t = useTranslations("Wallets");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(createTransactionAction, initialClearState);
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState(wallet.balance);
  const amount = mode === "full" ? wallet.balance : partialAmount;
  const sourceWallets = wallets.filter((w) => !w.archived && w.id !== wallet.id && w.type !== "debt" && w.type !== "lend");
  const [payFromId, setPayFromId] = useState(sourceWallets[0]?.id ?? "");
  const payFromWallet = sourceWallets.find((w) => w.id === payFromId);

  useEffect(() => {
    if (state.success) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  const overDebt = amount > wallet.balance;
  const insufficientFunds = !!payFromWallet && amount > payFromWallet.balance;
  const amountError = overDebt
    ? t("youOnlyOwe", { amount: formatCurrency(wallet.balance, wallet.currency, locale) })
    : insufficientFunds
      ? t("onlyAvailable", { amount: formatCurrency(payFromWallet!.balance, payFromWallet!.currency, locale), name: payFromWallet!.name })
      : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="kind" value="transfer" />
      <input type="hidden" name="toWalletId" value={wallet.id} />
      {/* No category field: the server tags this "Debt" automatically since it lands in a debt wallet. */}
      <input type="hidden" name="date" value={todayIso()} />

      <p className="text-[13px] text-text-secondary">
        {t.rich("youOwe", {
          amount: formatCurrency(wallet.balance, wallet.currency, locale),
          name: wallet.name,
          b: (chunks) => <span className="font-medium text-text-primary">{chunks}</span>,
        })}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {([
          { value: "full", label: t("fullClear") },
          { value: "partial", label: t("partialClear") },
        ] as const).map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-[13px] font-medium transition-colors ${
              mode === opt.value
                ? "border-brand bg-brand-soft text-brand"
                : "border-border text-text-secondary hover:bg-surface-2"
            }`}
          >
            <input
              type="radio"
              name="clearMode"
              value={opt.value}
              checked={mode === opt.value}
              onChange={() => setMode(opt.value)}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>

      <Field label={t("amount")} htmlFor="clear-amount" error={state.fieldErrors?.amount ?? amountError}>
        <Input
          id="clear-amount"
          name="amount"
          type="number"
          min="0.01"
          max={wallet.balance}
          step="0.01"
          value={amount}
          onChange={(e) => setPartialAmount(Number(e.target.value))}
          readOnly={mode === "full"}
          className={mode === "full" ? "bg-surface-2" : undefined}
          required
        />
      </Field>

      <Field label={t("payFromWallet")} htmlFor="clear-walletId" error={state.fieldErrors?.walletId}>
        <Select id="clear-walletId" name="walletId" value={payFromId} onChange={(e) => setPayFromId(e.target.value)} required>
          <option value="" disabled>
            {tCommon("chooseWallet")}
          </option>
          {sourceWallets.map((w) => (
            <option key={w.id} value={w.id}>{`${w.name} (${walletBalanceLabel(w, t, locale)})`}</option>
          ))}
        </Select>
      </Field>

      <Field label={tCommon("noteOptional")} htmlFor="clear-note">
        <Input id="clear-note" name="note" placeholder={t("clearNotePlaceholder")} defaultValue={t("debtClearanceDefault")} maxLength={140} />
      </Field>

      {sourceWallets.length === 0 && (
        <p className="text-[12.5px] text-text-muted">{t("noSourceWallets")}</p>
      )}

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        loading={pending}
        disabled={sourceWallets.length === 0 || amount <= 0 || overDebt || insufficientFunds}
        className="mt-1 self-end"
      >
        {pending ? t("clearingDebt") : t("clearDebt")}
      </Button>
    </form>
  );
}

/**
 * The mirror of ClearDebtForm: money flows the other way. `wallet` (the lend
 * wallet) is the hidden source, and the picker chooses which real wallet the
 * repayment gets deposited into — same transfer plumbing, reversed direction.
 */
function GetRepaidForm({
  wallet,
  wallets,
  onSuccess,
}: {
  wallet: Wallet;
  wallets: Wallet[];
  onSuccess: () => void;
}) {
  const t = useTranslations("Wallets");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(createTransactionAction, initialClearState);
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState(wallet.balance);
  const amount = mode === "full" ? wallet.balance : partialAmount;
  const destinationWallets = wallets.filter((w) => !w.archived && w.id !== wallet.id && w.type !== "debt" && w.type !== "lend");
  const [depositToId, setDepositToId] = useState(destinationWallets[0]?.id ?? "");

  useEffect(() => {
    if (state.success) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  const overLent = amount > wallet.balance;
  const amountError = overLent
    ? t("onlyLentAmount", { amount: formatCurrency(wallet.balance, wallet.currency, locale) })
    : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="kind" value="transfer" />
      <input type="hidden" name="walletId" value={wallet.id} />
      {/* No category field: a repayment out of a lend wallet isn't specially tagged, same as a savings withdrawal. */}
      <input type="hidden" name="date" value={todayIso()} />

      <p className="text-[13px] text-text-secondary">
        {t.rich("youAreOwed", {
          amount: formatCurrency(wallet.balance, wallet.currency, locale),
          name: wallet.name,
          b: (chunks) => <span className="font-medium text-text-primary">{chunks}</span>,
        })}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {([
          { value: "full", label: t("fullClear") },
          { value: "partial", label: t("partialClear") },
        ] as const).map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-[13px] font-medium transition-colors ${
              mode === opt.value
                ? "border-brand bg-brand-soft text-brand"
                : "border-border text-text-secondary hover:bg-surface-2"
            }`}
          >
            <input
              type="radio"
              name="repayMode"
              value={opt.value}
              checked={mode === opt.value}
              onChange={() => setMode(opt.value)}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>

      <Field label={t("amount")} htmlFor="repay-amount" error={state.fieldErrors?.amount ?? amountError}>
        <Input
          id="repay-amount"
          name="amount"
          type="number"
          min="0.01"
          max={wallet.balance}
          step="0.01"
          value={amount}
          onChange={(e) => setPartialAmount(Number(e.target.value))}
          readOnly={mode === "full"}
          className={mode === "full" ? "bg-surface-2" : undefined}
          required
        />
      </Field>

      <Field label={t("depositToWallet")} htmlFor="repay-toWalletId" error={state.fieldErrors?.toWalletId}>
        <Select id="repay-toWalletId" name="toWalletId" value={depositToId} onChange={(e) => setDepositToId(e.target.value)} required>
          <option value="" disabled>
            {tCommon("chooseWallet")}
          </option>
          {destinationWallets.map((w) => (
            <option key={w.id} value={w.id}>{`${w.name} (${walletBalanceLabel(w, t, locale)})`}</option>
          ))}
        </Select>
      </Field>

      <Field label={tCommon("noteOptional")} htmlFor="repay-note">
        <Input id="repay-note" name="note" placeholder={t("repaymentNotePlaceholder")} defaultValue={t("lendRepaymentDefault")} maxLength={140} />
      </Field>

      {destinationWallets.length === 0 && (
        <p className="text-[12.5px] text-text-muted">{t("noDestinationWallets")}</p>
      )}

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        loading={pending}
        disabled={destinationWallets.length === 0 || amount <= 0 || overLent}
        className="mt-1 self-end"
      >
        {pending ? t("gettingRepaid") : t("getRepaid")}
      </Button>
    </form>
  );
}

export function WalletDetailActions({ wallet, wallets }: { wallet: Wallet; wallets: Wallet[] }) {
  const t = useTranslations("Wallets");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [repayOpen, setRepayOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isEmpty = wallet.balance === 0;

  return (
    <div className="flex items-center gap-2">
      {wallet.type === "debt" && wallet.balance > 0 && (
        <Button variant="outline" size="sm" onClick={() => setClearOpen(true)}>
          <CircleDollarSign className="h-3.5 w-3.5" strokeWidth={2} />
          {t("clearDebt")}
        </Button>
      )}
      {wallet.type === "lend" && wallet.balance > 0 && (
        <Button variant="outline" size="sm" onClick={() => setRepayOpen(true)}>
          <HandCoins className="h-3.5 w-3.5" strokeWidth={2} />
          {t("getRepaid")}
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
        {tCommon("edit")}
      </Button>
      {pickDefaultCashWallet(wallets)?.id !== wallet.id && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDeleteError(null);
            setConfirmOpen(true);
          }}
          className="hover:bg-status-critical-soft! hover:text-status-critical!"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          {tCommon("delete")}
        </Button>
      )}

      <Modal open={clearOpen} onClose={() => setClearOpen(false)} title={t("clearDebtTitle")}>
        <ClearDebtForm wallet={wallet} wallets={wallets} onSuccess={() => setClearOpen(false)} />
      </Modal>

      <Modal open={repayOpen} onClose={() => setRepayOpen(false)} title={t("getRepaidTitle")}>
        <GetRepaidForm wallet={wallet} wallets={wallets} onSuccess={() => setRepayOpen(false)} />
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t("editWallet")}
      >
        <EditWalletForm wallet={wallet} isDefault={pickDefaultCashWallet(wallets)?.id === wallet.id} onSuccess={() => setEditOpen(false)} />
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("deleteWalletTitle")}
      >
        {isEmpty ? (
          <p className="text-sm text-text-secondary">
            {t.rich("deleteEmptyWalletDesc", {
              name: wallet.name,
              b: (chunks) => <span className="font-medium text-text-primary">{chunks}</span>,
            })}
          </p>
        ) : (
          <p className="text-sm text-text-secondary">
            {t.rich("deleteNonEmptyWalletDesc", {
              name: wallet.name,
              amount: formatCurrency(wallet.balance, wallet.currency, locale),
              action: wallet.type === "debt" ? t("payItOff") : wallet.type === "lend" ? t("getItRepaid") : t("moveOrWithdraw"),
              b: (chunks) => <span className="font-medium text-text-primary">{chunks}</span>,
            })}
          </p>
        )}
        {deleteError && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            {deleteError}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={isPending}
            disabled={!isEmpty}
            onClick={() => {
              setDeleteError(null);
              startTransition(async () => {
                const result = await deleteWalletAction(wallet.id);
                if (result?.error) {
                  setDeleteError(result.error);
                  return;
                }
                router.push("/wallets");
              });
            }}
          >
            {isPending ? tCommon("deleting") : t("deleteWallet")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
