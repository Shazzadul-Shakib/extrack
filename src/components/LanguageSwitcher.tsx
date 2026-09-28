"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cx } from "@/components/cx";

const LOCALE_LABEL: Record<string, string> = {
  en: "EN",
  bn: "বাং",
};

const LOCALE_FULL_LABEL: Record<string, string> = {
  en: "English",
  bn: "বাংলা",
};

/** Compact sliding two-way toggle — assumes exactly the two locales in routing.ts. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const activeIndex = locale === routing.locales[1] ? 1 : 0;

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cx("relative inline-flex shrink-0 rounded-full bg-surface-2 p-0.5", className)}
    >
      <span
        aria-hidden
        className={cx(
          "absolute inset-y-0.5 left-0.5 w-10 rounded-full bg-surface shadow-sm transition-transform duration-200 ease-out",
          activeIndex === 1 && "translate-x-10",
        )}
      />
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l })}
          aria-pressed={locale === l}
          title={LOCALE_FULL_LABEL[l] ?? l}
          className={cx(
            "relative z-10 h-7 w-10 rounded-full text-[12px] font-semibold transition-colors",
            locale === l ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
          )}
        >
          {LOCALE_LABEL[l] ?? l}
        </button>
      ))}
    </div>
  );
}
