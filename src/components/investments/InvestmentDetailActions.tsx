"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  addEntryAction,
  closeInvestmentAction,
  deleteInvestmentAction,
  reopenInvestmentAction,
  type InvestmentFormState,
} from "@/app/actions/investments";
import { Button, Field, Input, Select } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { InvestmentForm } from "./InvestmentForm";
import { walletBalanceLabel, todayIso } from "@/lib/format";
import type { Investment } from "@/lib/investments";
import type { Wallet } from "@/lib/types";

const initialState: InvestmentFormState = {};

function AmountInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      min="0"
      step="0.01"
      placeholder="0.00"
      // Blurring on wheel stops a scroll over a focused number field from changing its value.
      onWheel={(e) => e.currentTarget.blur()}
      {...props}
    />
  );
}

function ErrorLine({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
      {message}
    </p>
  );
}

function WalletSelect({ id, wallets, emptyLabel }: { id: string; wallets: Wallet[]; /** Label for the "no other wallet" choice; omit to make a wallet required. */ emptyLabel?: string }) {
  const t = useTranslations("Investments");
  const tWallets = useTranslations("Wallets");
  const locale = useLocale();
  return (
    <Select id={id} name="walletId" defaultValue="">
      <option value="">{emptyLabel ?? t("chooseWallet")}</option>
      {wallets.map((w) => (
        <option key={w.id} value={w.id}>
          {`${w.name} · ${walletBalanceLabel(w, tWallets, locale)}`}
        </option>
      ))}
    </Select>
  );
}

function EntryForm({ investment, wallets, onSuccess }: { investment: Investment; wallets: Wallet[]; onSuccess: () => void }) {
  const t = useTranslations("Investments");
  const tCommon = useTranslations("Common");
  const [state, formAction, pending] = useActionState(addEntryAction.bind(null, investment.id), initialState);
  const [kind, setKind] = useState("contribution");

  useEffect(() => {
    if (state.success) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <Field label={t("entryKind")} htmlFor="entry-kind" error={state.fieldErrors?.kind}>
        <Select id="entry-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="contribution">{t("kind.contribution")}</option>
          <option value="return">{t("kind.return")}</option>
          <option value="value_update">{t("kind.value_update")}</option>
        </Select>
      </Field>
      <p className="-mt-2 text-[12.5px] text-text-muted">{t(`kindHint.${kind}`)}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={kind === "value_update" ? t("newValue") : t("amount")} htmlFor="entry-amount" error={state.fieldErrors?.amount}>
          <AmountInput id="entry-amount" name="amount" />
        </Field>
        <Field label={t("date")} htmlFor="entry-date" error={state.fieldErrors?.date}>
          <Input id="entry-date" name="date" type="date" defaultValue={todayIso()} />
        </Field>
      </div>
      {kind !== "value_update" && (
        <>
          <Field label={kind === "contribution" ? t("paidFrom") : t("returnGoesTo")} htmlFor="entry-wallet">
            <WalletSelect id="entry-wallet" wallets={wallets} emptyLabel={kind === "contribution" ? t("noWalletExisting") : t("reinvest")} />
          </Field>
          <p className="-mt-2 text-[12.5px] text-text-muted">{t(kind === "contribution" ? "contributionWalletHint" : "returnWalletHint")}</p>
        </>
      )}
      <Field label={tCommon("noteOptional")} htmlFor="entry-note">
        <Input id="entry-note" name="note" maxLength={140} />
      </Field>
      <ErrorLine message={state.error} />
      <Button type="submit" loading={pending} className="mt-1 self-end">
        {pending ? tCommon("saving") : t("save")}
      </Button>
    </form>
  );
}

function CloseForm({ investment, wallets, onSuccess }: { investment: Investment; wallets: Wallet[]; onSuccess: () => void }) {
  const t = useTranslations("Investments");
  const tCommon = useTranslations("Common");
  const [state, formAction, pending] = useActionState(closeInvestmentAction.bind(null, investment.id), initialState);

  useEffect(() => {
    if (state.success) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <p className="text-[13px] text-text-muted">{t("closeIntro")}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("amountReceived")} htmlFor="close-received" error={state.fieldErrors?.received}>
          <AmountInput id="close-received" name="received" />
        </Field>
        <Field label={t("date")} htmlFor="close-date" error={state.fieldErrors?.date}>
          <Input id="close-date" name="date" type="date" defaultValue={todayIso()} />
        </Field>
        <Field label={t("receivedInto")} htmlFor="close-wallet" error={state.fieldErrors?.walletId}>
          <WalletSelect id="close-wallet" wallets={wallets} />
        </Field>
      </div>
      <p className="-mt-2 text-[12.5px] text-text-muted">{t("closeHint")}</p>
      <Field label={tCommon("noteOptional")} htmlFor="close-note">
        <Input id="close-note" name="note" maxLength={140} />
      </Field>
      <ErrorLine message={state.error} />
      <Button type="submit" loading={pending} className="mt-1 self-end">
        {pending ? tCommon("saving") : t("closeConfirm")}
      </Button>
    </form>
  );
}

export function InvestmentDetailActions({ investment, wallets }: { investment: Investment; wallets: Wallet[] }) {
  const t = useTranslations("Investments");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [modal, setModal] = useState<"entry" | "close" | "edit" | "delete" | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const closed = !!investment.closedAt;
  const moneyWallets = wallets.filter((w) => !w.archived && (w.type === "cash" || w.type === "bank" || w.type === "savings"));
  const done = () => setModal(null);

  function run(fn: () => Promise<{ error?: string }>, onOk?: () => void) {
    setError(undefined);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
      else onOk?.();
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {closed ? (
          <Button variant="outline" size="sm" loading={pending} onClick={() => run(() => reopenInvestmentAction(investment.id))}>
            <RotateCcw className="h-4 w-4" strokeWidth={2} />
            {t("reopen")}
          </Button>
        ) : (
          <>
            <Button size="sm" onClick={() => setModal("entry")}>
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              {t("addEntry")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setModal("close")}>
              <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
              {t("closeInvestment")}
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={() => setModal("edit")}>
          <Pencil className="h-4 w-4" strokeWidth={2} />
          {tCommon("edit")}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setModal("delete")}>
          <Trash2 className="h-4 w-4" strokeWidth={2} />
          {tCommon("delete")}
        </Button>
      </div>
      {error && !modal && <p role="alert" className="text-[13px] text-status-critical">{error}</p>}

      <Modal open={modal === "entry"} onClose={done} title={t("addEntry")}>
        <EntryForm investment={investment} wallets={moneyWallets} onSuccess={done} />
      </Modal>
      <Modal open={modal === "close"} onClose={done} title={t("closeInvestment")}>
        <CloseForm investment={investment} wallets={moneyWallets} onSuccess={done} />
      </Modal>
      <Modal open={modal === "edit"} onClose={done} title={t("editInvestment")}>
        <InvestmentForm investment={investment} onSuccess={done} />
      </Modal>
      <Modal open={modal === "delete"} onClose={done} title={t("deleteTitle")}>
        <p className="text-sm text-text-secondary">{t("deleteBody", { name: investment.name })}</p>
        {error && <p role="alert" className="mt-3 text-[13px] text-status-critical">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={done}>
            {tCommon("cancel")}
          </Button>
          <Button variant="danger" size="sm" loading={pending} onClick={() => run(() => deleteInvestmentAction(investment.id), () => router.push("/investments"))}>
            {pending ? tCommon("deleting") : tCommon("delete")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
