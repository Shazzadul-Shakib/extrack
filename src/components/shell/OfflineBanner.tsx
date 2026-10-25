"use client";

import { useOffline } from "next/offline";
import { useTranslations } from "next-intl";

/** Extrack only works online: while offline, cover the app with a reconnect prompt. */
export function OfflineBanner() {
  const isOffline = useOffline();
  const t = useTranslations("Offline");
  if (!isOffline) return null;
  return (
    <div
      role="alert"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-2 bg-page px-6 text-center"
    >
      <h2 className="text-lg font-semibold text-text-primary">{t("title")}</h2>
      <p className="text-sm text-text-secondary">{t("message")}</p>
    </div>
  );
}
