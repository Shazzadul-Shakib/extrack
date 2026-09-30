"use client";

import { useActionState, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  AlertCircle,
  ArrowLeftRight,
  Plus,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  createTransactionAction,
  updateTransactionAction,
  type TransactionFormState,
} from "@/app/actions/transactions";
import { quickCreateWalletAction, type WalletFormState } from "@/app/actions/wallets";
import { Button, Field, Input, Select } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, DEBT_CATEGORY, SAVINGS_CATEGORY, LEND_CATEGORY } from "@/lib/categories";
import { formatCurrency, todayIso, walletBalanceLabel } from "@/lib/format";
import { walletDelta } from "@/lib/finance";
import type { Transaction, TransactionKind, Wallet, WalletType } from "@/lib/types";

const initialState: TransactionFormState = {};
const initialWalletState: WalletFormState = {};

/**
 * A minimal, in-context wallet creator for when "Savings" or "Lend" is picked
 * as an expense category and none exists yet. Debt intentionally has no
 * equivalent here — a debt payment clears an existing balance, so a brand-new
 * $0 debt wallet would just go negative; debt wallets are created from the
 * Debts page instead, where a real starting balance (what's already owed) can
 * be set. Savings and lend don't have that problem — both start at $0 and grow
 * from this very transfer.
 */
function QuickWalletForm({ type, onCreated }: { type: "savings" | "lend"; onCreated: (wallet: Wallet) => void }) {
  const t = useTranslations("Transactions");
  const tWallets = useTranslations("Wallets");
  const [state, formAction, pending] = useActionState(quickCreateWalletAction, initialWalletState);

  useEffect(() => {
    if (state.success && state.wallet) onCreated(state.wallet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="balance" value="0" />
      <Field label={tWallets("walletName")} htmlFor="quick-wallet-name" error={state.fieldErrors?.name}>
        <Input id="quick-wallet-name" name="name" placeholder={t("quickWalletNamePlaceholder")} autoFocus required />
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
        {pending ? tWallets("creatingWallet") : type === "savings" ? t("createSavingsWallet") : t("createLendWallet")}
      </Button>
    </form>
  );
}

/** What `wallet`'s balance would be if `original` (the transaction being edited) hadn't happened yet. */
function availableBalance(wallet: Wallet, original?: Transaction): number {
  let balance = wallet.balance;
  if (!original) return balance;
  if (original.walletId === wallet.id) {
    const effectKind = original.kind === "income" ? "income" : "expense";
    balance -= walletDelta(wallet.type, effectKind, original.amount);
  }
  if (original.kind === "transfer" && original.toWalletId === wallet.id) {
    balance -= walletDelta(wallet.type, "income", original.amount);
  }
  return balance;
}

const KIND_OPTIONS: {
  value: TransactionKind;
  icon: LucideIcon;
}[] = [
  { value: "expense", icon: TrendingDown },
  { value: "income", icon: TrendingUp },
  { value: "transfer", icon: ArrowLeftRight },
];

export function TransactionForm({
  wallets,
  defaultWalletId,
  transaction,
  onSuccess,
}: {
  wallets: Wallet[];
  defaultWalletId?: string;
  transaction?: Transaction;
  onSuccess?: () => void;
}) {
  const t = useTranslations("Transactions");
  const tCommon = useTranslations("Common");
  const tCategories = useTranslations("Categories");
  const tWallets = useTranslations("Wallets");
  const locale = useLocale();
  const isEdit = !!transaction;
  const action = isEdit
    ? updateTransactionAction.bind(null, transaction.id)
    : createTransactionAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [kind, setKind] = useState<TransactionKind>(
    transaction?.kind ?? "expense",
  );
  const [walletId, setWalletId] = useState(transaction?.walletId ?? defaultWalletId ?? "");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [targetWalletId, setTargetWalletId] = useState("");
  const [createWalletOpen, setCreateWalletOpen] = useState(false);
  const [extraWallet, setExtraWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    if (state.success) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  const categoryOptions =
    kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const selectedWallet = wallets.find((w) => w.id === walletId);
  const amountNum = Number(amount);
  const available = selectedWallet ? availableBalance(selectedWallet, transaction) : undefined;
  const insufficientFunds =
    kind !== "income" &&
    !!selectedWallet &&
    selectedWallet.type !== "debt" &&
    available !== undefined &&
    amountNum > 0 &&
    amountNum > available;

  // Picking "Debt", "Savings", or "Lend" as an expense category really means
  // "this money went toward paying down a debt / into a savings goal / out as
  // a loan to someone" — so under the hood it's submitted as a transfer into
  // that wallet, same as Clear debt or funding a savings/lend wallet does,
  // just discovered from the expense flow.
  const allWallets = extraWallet ? [...wallets, extraWallet] : wallets;
  const targetType: WalletType | null =
    kind === "expense" && category === DEBT_CATEGORY
      ? "debt"
      : kind === "expense" && category === SAVINGS_CATEGORY
        ? "savings"
        : kind === "expense" && category === LEND_CATEGORY
          ? "lend"
          : null;
  const targetCandidates = targetType ? allWallets.filter((w) => w.type === targetType && !w.archived) : [];
  const missingTargetWallet = !!targetType && !targetWalletId;
  const submittedKind: TransactionKind = targetType ? "transfer" : kind;

  return (
    // The inline "create a wallet" modal below is rendered as a sibling of this
    // <form>, not nested inside it — React re-dispatches native events (like
    // `submit`) along the React tree even for portaled elements, so a wallet-form
    // nested inside this form's React subtree would have its submit interfere
    // with this outer form's own submit handling.
    <>
      <form action={formAction} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          {KIND_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <label
                key={opt.value}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[13px] font-medium transition-colors ${
                  kind === opt.value
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border text-text-secondary hover:bg-surface-2"
                }`}
              >
                <input
                  type="radio"
                  value={opt.value}
                  checked={kind === opt.value}
                  onChange={() => {
                    setKind(opt.value);
                    setCategory("");
                    setTargetWalletId("");
                  }}
                  className="sr-only"
                />
                <Icon className="h-4 w-4" strokeWidth={2} />
                {tCommon(opt.value === "expense" ? "kindExpense" : opt.value === "income" ? "kindIncome" : "kindTransfer")}
              </label>
            );
          })}
        </div>
        {/* Single source of truth for the submitted kind — picking Debt/Savings below
            silently turns an expense into a transfer into that wallet. */}
        <input type="hidden" name="kind" value={submittedKind} />

        <Field
          label={t("amount")}
          htmlFor="amount"
          error={
            state.fieldErrors?.amount ??
            (insufficientFunds
              ? tWallets("onlyAvailable", { amount: formatCurrency(available!, selectedWallet!.currency, locale), name: selectedWallet!.name })
              : undefined)
          }
        >
          <Input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>

        <Field
          label={t("kindLabel", { kind })}
          htmlFor="walletId"
          error={state.fieldErrors?.walletId}
        >
          <Select
            id="walletId"
            name="walletId"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            required
          >
            <option value="" disabled>
              {tCommon("chooseWallet")}
            </option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>{`${w.name} (${walletBalanceLabel(w, tWallets, locale)})`}</option>
            ))}
          </Select>
        </Field>

        {kind === "transfer" && (
          <Field
            label={t("toWallet")}
            htmlFor="toWalletId"
            error={state.fieldErrors?.toWalletId}
          >
            <Select
              id="toWalletId"
              name="toWalletId"
              defaultValue={transaction?.toWalletId ?? ""}
              required
            >
              <option value="" disabled>
                {tCommon("chooseWallet")}
              </option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>{`${w.name} (${walletBalanceLabel(w, tWallets, locale)})`}</option>
              ))}
            </Select>
          </Field>
        )}

        {kind !== "transfer" && (
          <Field
            label={tCommon("category")}
            htmlFor="category"
            error={state.fieldErrors?.category}
          >
            <Select
              id="category"
              name="category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setTargetWalletId("");
              }}
              required
            >
              <option value="" disabled>
                {tCommon("chooseCategory")}
              </option>
              {categoryOptions.map((c) => (
                <option key={c.name} value={c.name}>
                  {tCategories(c.name)}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {targetType && (
          <>
            <Field
              label={
                targetType === "debt"
                  ? t("whichDebtWallet")
                  : targetType === "savings"
                    ? t("whichSavingsWallet")
                    : t("whichLendWallet")
              }
              htmlFor="targetWalletId"
              error={state.fieldErrors?.toWalletId}
            >
              {targetCandidates.length > 0 ? (
                <Select
                  id="targetWalletId"
                  name="toWalletId"
                  value={targetWalletId}
                  onChange={(e) => setTargetWalletId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    {tCommon("chooseWallet")}
                  </option>
                  {targetCandidates.map((w) => (
                    <option key={w.id} value={w.id}>{`${w.name} (${walletBalanceLabel(w, tWallets, locale)})`}</option>
                  ))}
                </Select>
              ) : targetType === "debt" ? (
                <>
                  <input type="hidden" name="toWalletId" value="" />
                  <p className="text-[13px] text-text-muted">
                    {t.rich("noDebtWalletYet", {
                      link: (chunks) => (
                        <Link href="/debts" className="font-medium text-brand hover:underline">
                          {chunks}
                        </Link>
                      ),
                    })}
                  </p>
                </>
              ) : (
                <input type="hidden" name="toWalletId" value="" />
              )}
            </Field>
            {(targetType === "savings" || targetType === "lend") && (
              <button
                type="button"
                onClick={() => setCreateWalletOpen(true)}
                className="-mt-2 inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-brand hover:underline"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                {targetType === "savings" ? t("createSavingsWallet") : t("createLendWallet")}
              </button>
            )}
          </>
        )}

        <Field label={t("date")} htmlFor="date" error={state.fieldErrors?.date}>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={transaction?.date ?? todayIso()}
            max={todayIso()}
            required
          />
        </Field>

        <Field label={t("description")} htmlFor="note">
          <Input
            id="note"
            name="note"
            placeholder={t("descriptionPlaceholder")}
            defaultValue={transaction?.note}
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

        <Button type="submit" loading={pending} disabled={insufficientFunds || missingTargetWallet} className="mt-1 self-end">
          {pending ? tCommon("saving") : isEdit ? tCommon("saveChanges") : t("addTransaction")}
        </Button>
      </form>
      {(targetType === "savings" || targetType === "lend") && (
        <Modal
          open={createWalletOpen}
          onClose={() => setCreateWalletOpen(false)}
          title={targetType === "savings" ? t("newSavingsWallet") : t("newLendWallet")}
        >
          <QuickWalletForm
            type={targetType}
            onCreated={(wallet) => {
              setExtraWallet(wallet);
              setTargetWalletId(wallet.id);
              setCreateWalletOpen(false);
            }}
          />
        </Modal>
      )}
    </>
  );
}
