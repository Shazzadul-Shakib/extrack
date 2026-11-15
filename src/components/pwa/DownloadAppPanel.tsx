"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, CheckCircle2, Copy, Download, Info } from "lucide-react";
import { Button } from "@/components/ui";
import { MAX_TRIES, usePwaInstall } from "@/hooks/usePwaInstall";

function Notice({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4 text-left">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" strokeWidth={2} />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="text-[13px] text-text-secondary">{body}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function DownloadAppPanel() {
  const t = useTranslations("Download");
  const { support, status, attempt, install } = usePwaInstall();
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — nothing useful to do */
    }
  }

  if (support === "unknown") {
    return <div className="h-12 animate-pulse rounded-lg bg-surface-2" aria-hidden />;
  }

  if (support === "installed" || status === "installed") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border bg-brand-soft p-4 text-left">
        <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" strokeWidth={2} />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-text-primary">{t("installedTitle")}</p>
          <p className="text-[13px] text-text-secondary">{t("installedBody")}</p>
        </div>
      </div>
    );
  }

  if (support === "ios") {
    return (
      <Notice title={t("iosTitle")} body={t("iosBody")} />
    );
  }

  if (support === "inapp") {
    return (
      <Notice title={t("inappTitle")} body={t("inappBody")}>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? <Check className="h-4 w-4" strokeWidth={2} /> : <Copy className="h-4 w-4" strokeWidth={2} />}
            {copied ? t("copied") : t("copyLink")}
          </Button>
        </div>
      </Notice>
    );
  }

  if (support === "insecure") {
    return <Notice title={t("insecureTitle")} body={t("insecureBody")} />;
  }

  if (support === "unsupported") {
    return (
      <Notice title={t("unsupportedTitle")} body={t("unsupportedBody")} />
    );
  }

  const working = status === "preparing" || status === "prompting" || status === "installing";
  const label =
    status === "preparing"
      ? t("preparing", { attempt, max: MAX_TRIES })
      : status === "prompting"
        ? t("prompting")
        : status === "installing"
          ? t("installing")
          : status === "cancelled" || status === "failed"
            ? t("tryAgain")
            : t("button");

  return (
    <div className="flex flex-col gap-3">
      <Button size="lg" className="w-full" loading={working} onClick={install}>
        {!working && <Download className="h-5 w-5" strokeWidth={2} />}
        {label}
      </Button>
      {status === "cancelled" && <p className="text-[13px] text-text-muted">{t("cancelled")}</p>}
      {status === "failed" && (
        <Notice title={t("failedTitle")} body={t("failedBody")} />
      )}
    </div>
  );
}
