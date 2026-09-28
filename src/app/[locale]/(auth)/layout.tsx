import { getTranslations } from "next-intl/server";
import { Logomark } from "@/components/Logomark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Common");
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center bg-page px-4 py-10">
      <LanguageSwitcher className="mb-8" />
      <main className="w-full max-w-100 flex-1 flex flex-col justify-center">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <Logomark />
          <h1 className="text-lg font-semibold text-text-primary">{t("brand")}</h1>
          <p className="text-[13px] text-text-muted">{t("tagline")}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
