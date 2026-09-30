"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { createFeatureRequestAction, type FeatureFormState } from "@/app/actions/features";
import { FEATURE_DESCRIPTION_MAX, FEATURE_TITLE_MAX } from "@/lib/featureConstants";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";

const initialState: FeatureFormState = {};

export function FeatureRequestForm() {
  const t = useTranslations("Features");
  const [state, formAction, pending] = useActionState(createFeatureRequestAction, initialState);

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold text-text-primary">{t("formTitle")}</h3>
      <p className="mb-4 text-[13px] text-text-muted">{t("formDesc")}</p>
      {/* React resets an uncontrolled form after every action: a successful post comes back empty, and a
          failed one is refilled from `state.values` through defaultValue, so nothing typed is lost. */}
      <form action={formAction} noValidate className="flex flex-col gap-4">
        <Field label={t("titleLabel")} htmlFor="feature-title" error={state.fieldErrors?.title}>
          <Input
            id="feature-title"
            name="title"
            placeholder={t("titlePlaceholder")}
            maxLength={FEATURE_TITLE_MAX}
            defaultValue={state.values?.title}
            required
          />
        </Field>
        <Field label={t("descriptionLabel")} htmlFor="feature-description" error={state.fieldErrors?.description}>
          <Textarea
            id="feature-description"
            name="description"
            placeholder={t("descriptionPlaceholder")}
            maxLength={FEATURE_DESCRIPTION_MAX}
            defaultValue={state.values?.description}
          />
        </Field>
        {state.error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="flex items-start gap-2 rounded-lg bg-status-good-soft px-3 py-2 text-[13px] text-status-good">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            {t("submitted")}
          </p>
        )}
        <Button type="submit" loading={pending} className="self-end">
          {pending ? t("submitting") : t("submit")}
        </Button>
      </form>
    </Card>
  );
}
