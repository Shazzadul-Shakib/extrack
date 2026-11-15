"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useInstalledOnDevice, useIsStandalone } from "@/hooks/usePwaInstall";
import { cx } from "@/components/cx";

/** Entry point to /download-app. Renders nothing inside the installed app. */
export function DownloadAppLink({
  variant = "nav",
  className,
  onNavigate,
}: {
  variant?: "nav" | "header";
  className?: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Download");
  const standalone = useIsStandalone();
  const installed = useInstalledOnDevice();
  if (standalone || installed) return null;

  return (
    <Link
      href="/download-app"
      onClick={onNavigate}
      className={cx(
        variant === "nav"
          ? "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
          : "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary",
        className,
      )}
    >
      <Download className={variant === "nav" ? "h-4.5 w-4.5 shrink-0" : "h-4 w-4 shrink-0"} strokeWidth={2} />
      {t("link")}
    </Link>
  );
}
