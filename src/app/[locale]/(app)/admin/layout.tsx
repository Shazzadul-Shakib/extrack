import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/session";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Not the only check — every admin page and every admin query verifies the caller again.
  // This one just keeps the admin chrome from rendering for anyone else.
  await requireAdmin();
  const t = await getTranslations("Admin");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-text-primary">{t("pageTitle")}</h2>
        <p className="text-[13px] text-text-muted">{t("pageDesc")}</p>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
