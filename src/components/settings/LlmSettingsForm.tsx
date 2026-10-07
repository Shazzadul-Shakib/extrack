"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, ChevronDown, Info, Pencil, Trash2 } from "lucide-react";
import { saveLlmSettingsAction, removeLlmApiKeyAction, type LlmSettingsFormState } from "@/app/actions/settings";
import { Modal } from "@/components/Modal";
import { Button, Field, Input } from "@/components/ui";
import { cx } from "@/components/cx";
import type { UserSettingsView } from "@/lib/queries";
import type { LlmProvider } from "@prisma/client";

const initialState: LlmSettingsFormState = {};

const PROVIDERS: { value: LlmProvider; labelKey: "providerClaude" | "providerOpenai" | "providerGoogle" }[] = [
  { value: "anthropic", labelKey: "providerClaude" },
  { value: "openai", labelKey: "providerOpenai" },
  { value: "google", labelKey: "providerGoogle" },
];

const SHORT_LABEL: Record<LlmProvider, string> = { anthropic: "Claude", openai: "ChatGPT", google: "Gemini" };
const KEY_PAGE_URL: Record<LlmProvider, string> = {
  anthropic: "https://console.anthropic.com/settings/keys",
  openai: "https://platform.openai.com/api-keys",
  google: "https://aistudio.google.com/apikey",
};
const SIGNUP_URL: Record<LlmProvider, string> = {
  anthropic: "https://console.anthropic.com",
  openai: "https://platform.openai.com",
  google: "https://aistudio.google.com/apikey",
};
const BILLING_URL: Record<LlmProvider, string> = {
  anthropic: "https://console.anthropic.com/settings/billing",
  openai: "https://platform.openai.com/settings/organization/billing",
  google: "https://aistudio.google.com/apikey",
};
const STEP_PREFIX: Record<LlmProvider, "claude" | "openai" | "google"> = {
  anthropic: "claude",
  openai: "openai",
  google: "google",
};

function hasKeyFor(settings: UserSettingsView, provider: LlmProvider): boolean {
  if (provider === "anthropic") return settings.hasAnthropicKey;
  if (provider === "openai") return settings.hasOpenaiKey;
  return settings.hasGoogleKey;
}

function externalLink(url: string) {
  function ExternalLink(chunks: React.ReactNode) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">
        {chunks}
      </a>
    );
  }
  return ExternalLink;
}

/** Step-by-step "how do I get one of these" instructions, collapsed by default, specific to
 *  the currently-selected provider — including what to do once its free/trial quota runs out. */
function ApiKeyInstructions({ provider }: { provider: LlmProvider }) {
  const t = useTranslations("Settings");
  const [open, setOpen] = useState(false);
  const prefix = STEP_PREFIX[provider];

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[13px] font-medium text-brand hover:underline"
      >
        <ChevronDown className={cx("h-3.5 w-3.5 transition-transform", open && "rotate-180")} strokeWidth={2} />
        {t("howToGetKeyToggle", { provider: SHORT_LABEL[provider] })}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-border bg-surface-2 p-3 text-[12.5px] text-text-secondary">
          <ol className="list-decimal space-y-1.5 pl-4">
            <li>{t.rich(`${prefix}Step1`, { link: externalLink(SIGNUP_URL[provider]) })}</li>
            <li>{t.rich(`${prefix}Step2`, { link: externalLink(BILLING_URL[provider]) })}</li>
            <li>{t.rich(`${prefix}Step3`, { link: externalLink(KEY_PAGE_URL[provider]) })}</li>
            <li>{t(`${prefix}Step4`)}</li>
          </ol>
          <p className="mt-2 border-t border-border pt-2 text-text-muted">
            {t.rich(`${prefix}QuotaNote`, { link: externalLink(BILLING_URL[provider]) })}
          </p>
        </div>
      )}
    </div>
  );
}

export function LlmSettingsForm({ settings }: { settings: UserSettingsView }) {
  const t = useTranslations("Settings");
  const tCommon = useTranslations("Common");
  const [state, formAction, pending] = useActionState(saveLlmSettingsAction, initialState);
  const [provider, setProvider] = useState<LlmProvider>(settings.llmProvider ?? "anthropic");
  const [removing, startRemoveTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Editing is tied to the provider and the form state it started from, so switching provider
  // or completing a save (which yields a new `state`) drops back to the masked view on its own.
  const [editFor, setEditFor] = useState<{ provider: LlmProvider; state: LlmSettingsFormState } | null>(null);
  const apiKeyRef = useRef<HTMLInputElement>(null);

  // Imperative, not setState — this only ever clears the field after a successful save, it
  // doesn't drive any rendered state, so it doesn't need to go through React state.
  useEffect(() => {
    if (state.success && apiKeyRef.current) apiKeyRef.current.value = "";
  }, [state.success]);

  const hasKeyForSelected = hasKeyFor(settings, provider);
  const editing = editFor?.provider === provider && editFor.state === state;
  const showMasked = hasKeyForSelected && !editing;

  function handleRemove(target: LlmProvider) {
    startRemoveTransition(async () => {
      await removeLlmApiKeyAction(target);
      setConfirmOpen(false);
    });
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {PROVIDERS.map((opt) => {
          const connected = hasKeyFor(settings, opt.value);
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-colors ${
                provider === opt.value
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-border text-text-secondary hover:bg-surface-2"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="provider"
                    value={opt.value}
                    checked={provider === opt.value}
                    onChange={() => setProvider(opt.value)}
                    className="sr-only"
                  />
                  {t(opt.labelKey)}
                </span>
                {connected && <CheckCircle2 className="h-4 w-4 shrink-0 text-status-good" strokeWidth={2} />}
              </span>
              {connected && (
                <span className="text-[12px] font-normal text-text-muted">{t("connectedBadge")}</span>
              )}
            </label>
          );
        })}
      </div>

      <ApiKeyInstructions provider={provider} />

      {provider === "google" && (
        <p className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-[12.5px] text-text-secondary">
          <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          {t("googleFreeTierNotice")}
        </p>
      )}

      <Field label={t("apiKeyLabel")} htmlFor="apiKey" error={state.fieldErrors?.apiKey}>
        {showMasked ? (
          <Input key="masked" id="apiKey" type="password" value="••••••••••••••••••••" readOnly aria-label={t("apiKeyLabel")} />
        ) : (
          <Input
            key="editable"
            ref={apiKeyRef}
            id="apiKey"
            name="apiKey"
            type="password"
            autoComplete="off"
            defaultValue=""
            autoFocus={editing}
            placeholder={hasKeyForSelected ? t("apiKeyPlaceholderConnected") : t("apiKeyPlaceholderNew")}
          />
        )}
      </Field>

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {showMasked ? (
          <>
            <Button key="remove" type="button" variant="outline" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} />
              {t("removeKey")}
            </Button>
            <Button key="edit" type="button" onClick={() => setEditFor({ provider, state })}>
              <Pencil className="h-4 w-4 shrink-0" strokeWidth={2} />
              {t("editKey")}
            </Button>
          </>
        ) : (
          <>
            {editing && (
              <Button type="button" variant="outline" onClick={() => setEditFor(null)}>
                {tCommon("cancel")}
              </Button>
            )}
            <Button key="save" type="submit" loading={pending}>
              {pending ? t("saving") : t("saveButton")}
            </Button>
          </>
        )}
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={t("removeKeyTitle")}>
        <p className="text-sm text-text-secondary">{t("removeKeyConfirm", { provider: SHORT_LABEL[provider] })}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
            {tCommon("cancel")}
          </Button>
          <Button type="button" variant="danger" size="sm" loading={removing} onClick={() => handleRemove(provider)}>
            {removing ? t("removingKey") : t("removeKey")}
          </Button>
        </div>
      </Modal>
    </form>
  );
}
