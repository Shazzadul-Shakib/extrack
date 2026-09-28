import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Search, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/session";
import { getAdminUsers } from "@/lib/admin";
import { formatDate, formatNumber } from "@/lib/format";
import { Badge, Button, Card, EmptyState, Input } from "@/components/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `${t("tabs.users")} — ${t("pageTitle")} — Extrack` };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const page = Math.max(1, Math.floor(Number(first(params.page))) || 1);
  const [t, locale, { rows, total, pageSize }] = await Promise.all([
    getTranslations("Admin"),
    getLocale(),
    getAdminUsers({ page, q }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };

  return (
    <div className="flex flex-col gap-4">
      <form action="" method="get" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" strokeWidth={2} />
          <Input name="q" defaultValue={q} placeholder={t("searchUsers")} aria-label={t("searchUsers")} className="pl-9" />
        </div>
        <Button type="submit" variant="secondary">
          {t("search")}
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState icon={Users} title={t("noUsers")} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-180 border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-medium">{t("colUser")}</th>
                <th className="px-4 py-3 font-medium">{t("colJoined")}</th>
                <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
                <th className="px-4 py-3 font-medium">{t("colMethod")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("colTransactions")}</th>
                <th className="px-4 py-3 font-medium">{t("colLastActive")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{user.name}</p>
                    <p className="text-[12.5px] text-text-muted">{user.email}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{formatDate(user.createdAt.slice(0, 10), locale)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.verified ? "good" : "neutral"}>{user.verified ? t("verified") : t("unverified")}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                    {[user.withPassword && t("methodPassword"), user.withGoogle && t("methodGoogle")].filter(Boolean).join(" + ")}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-primary">{formatNumber(user.transactionCount, locale)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                    {user.lastActiveAt ? formatDate(user.lastActiveAt.slice(0, 10), locale) : <span className="text-text-muted">{t("never")}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="flex items-center justify-between text-[13px] text-text-muted">
        <span>{t("usersCount", { count: total })}</span>
        <div className="flex items-center gap-3">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="font-medium text-brand hover:underline">
              ← {t("previous")}
            </Link>
          )}
          <span>{t("pageOf", { page: formatNumber(page, locale), pages: formatNumber(pageCount, locale) })}</span>
          {page < pageCount && (
            <Link href={pageHref(page + 1)} className="font-medium text-brand hover:underline">
              {t("next")} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
