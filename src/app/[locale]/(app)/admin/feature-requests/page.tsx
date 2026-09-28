import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Lightbulb } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { getAdminFeatureRequests } from "@/lib/admin";
import { AdminFeatureRow } from "@/components/admin/AdminFeatureRow";
import { EmptyState } from "@/components/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `${t("tabs.featureRequests")} — ${t("pageTitle")} — Extrack` };
}

export default async function AdminFeatureRequestsPage() {
  await requireAdmin();
  const [t, requests] = await Promise.all([getTranslations("Admin"), getAdminFeatureRequests()]);

  if (requests.length === 0) {
    return <EmptyState icon={Lightbulb} title={t("noRequests")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((request) => (
        <AdminFeatureRow key={request.id} request={request} />
      ))}
    </div>
  );
}
