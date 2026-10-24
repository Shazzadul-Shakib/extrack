"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { createInvestmentAction, updateInvestmentAction, type InvestmentFormState } from "@/app/actions/investments";
import { Button, Field, Input, Select } from "@/components/ui";
import { INVESTMENT_TYPES, MATURING_TYPES, RATED_TYPES, REBATE_DEFAULT_TYPES, type Investment, type InvestmentType } from "@/lib/investments";
import { todayIso } from "@/lib/format";

const initialState: InvestmentFormState = {};

function Check({ id, name, label, hint, checked, onChange }: { id: string; name: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex items-start gap-2.5 text-sm text-text-secondary">
      <input id={id} name={name} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand" />
      <span>
        <span className="block text-text-primary">{label}</span>
        <span className="block text-[12.5px] text-text-muted">{hint}</span>
      </span>
    </label>
  );
}

/** Creates an investment, or edits `investment` when given. */
export function InvestmentForm({ investment, onSuccess }: { investment?: Investment; onSuccess: (id?: string) => void }) {
  const t = useTranslations("Investments");
  const tCommon = useTranslations("Common");
  const action = investment ? updateInvestmentAction.bind(null, investment.id) : createInvestmentAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [type, setType] = useState<InvestmentType>(investment?.type ?? "dps");
  const [rebate, setRebate] = useState(investment?.rebateEligible ?? REBATE_DEFAULT_TYPES.includes("dps"));
  const [atSource, setAtSource] = useState(investment?.taxedAtSource ?? false);

  useEffect(() => {
    if (state.success) onSuccess(state.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  function chooseType(next: InvestmentType) {
    setType(next);
    // A new investment starts with the usual answer for its type; the user can still flip it.
    if (!investment) setRebate(REBATE_DEFAULT_TYPES.includes(next));
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <Field label={t("name")} htmlFor="inv-name" error={state.fieldErrors?.name}>
        <Input id="inv-name" name="name" defaultValue={investment?.name} placeholder={t("namePlaceholder")} required />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("typeLabel")} htmlFor="inv-type" error={state.fieldErrors?.type}>
          <Select id="inv-type" name="type" value={type} onChange={(e) => chooseType(e.target.value as InvestmentType)}>
            {INVESTMENT_TYPES.map((it) => (
              <option key={it} value={it}>
                {t(`type.${it}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("institution")} htmlFor="inv-institution">
          <Input id="inv-institution" name="institution" defaultValue={investment?.institution} placeholder={t("institutionPlaceholder")} />
        </Field>
        <Field label={t("startDate")} htmlFor="inv-start" error={state.fieldErrors?.startDate}>
          <Input id="inv-start" name="startDate" type="date" defaultValue={investment?.startDate ?? todayIso()} />
        </Field>
        {MATURING_TYPES.includes(type) && (
          <Field label={t("maturityDate")} htmlFor="inv-maturity" error={state.fieldErrors?.maturityDate}>
            <Input id="inv-maturity" name="maturityDate" type="date" defaultValue={investment?.maturityDate ?? ""} />
          </Field>
        )}
        {RATED_TYPES.includes(type) && (
          <Field label={t("rate")} htmlFor="inv-rate" error={state.fieldErrors?.ratePercent}>
            <Input
              id="inv-rate"
              name="ratePercent"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              // Blurring on wheel stops a scroll over a focused number field from changing its value.
              onWheel={(e) => e.currentTarget.blur()}
              defaultValue={investment?.ratePercent ?? ""}
            />
          </Field>
        )}
      </div>
      {RATED_TYPES.includes(type) && <p className="-mt-2 text-[12.5px] text-text-muted">{t("rateHint")}</p>}
      <Check id="inv-rebate" name="rebateEligible" label={t("rebateEligible")} hint={t("rebateEligibleHint")} checked={rebate} onChange={setRebate} />
      <Check id="inv-source" name="taxedAtSource" label={t("taxedAtSource")} hint={t("taxedAtSourceHint")} checked={atSource} onChange={setAtSource} />
      <Field label={tCommon("noteOptional")} htmlFor="inv-note">
        <Input id="inv-note" name="note" defaultValue={investment?.note} maxLength={140} />
      </Field>
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          {state.error}
        </p>
      )}
      <Button type="submit" loading={pending} className="mt-1 self-end">
        {pending ? tCommon("saving") : investment ? tCommon("saveChanges") : t("save")}
      </Button>
    </form>
  );
}
