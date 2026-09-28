import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/session";
import { getAdminOverview } from "@/lib/admin";
import { formatNumber } from "@/lib/format";
import { AdminStat } from "@/components/admin/AdminStat";
import { CountBars } from "@/components/admin/CountBars";
import { DayBarChart } from "@/components/admin/DayBarChart";
import { FeatureStatusBadge } from "@/components/updates/FeatureStatusBadge";
import { Card } from "@/components/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `${t("pageTitle")} — Extrack` };
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const [t, tCategories, tWalletTypes, tCommon, tFeatures, locale, data] = await Promise.all([
    getTranslations("Admin"),
    getTranslations("Categories"),
    getTranslations("WalletTypes"),
    getTranslations("Common"),
    getTranslations("Features.status"),
    getLocale(),
    getAdminOverview(),
  ]);
  const n = (value: number) => formatNumber(value, locale);
  const { users, activity, features } = data;
  const verifiedPct = users.total > 0 ? Math.round((users.verified / users.total) * 100) : 0;

  const kindLabel: Record<string, string> = {
    expense: tCommon("kindExpense"),
    income: tCommon("kindIncome"),
    transfer: tCommon("kindTransfer"),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminStat label={t("totalUsers")} value={n(users.total)} hint={t("verifiedHint", { count: n(users.verified), pct: n(verifiedPct) })} />
        <AdminStat label={t("newUsers7")} value={n(users.newLast7Days)} hint={t("newUsers30Hint", { count: n(users.newLast30Days) })} />
        <AdminStat label={t("activeUsers")} value={n(users.activeLast30Days)} hint={t("activeUsersHint")} />
        <AdminStat
          label={t("transactionsLogged")}
          value={n(activity.transactions)}
          hint={t("transactions30Hint", { count: n(activity.transactionsLast30Days) })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">{t("signupsChart")}</h3>
          <DayBarChart data={data.signupsByDay} slot={1} locale={locale} summary={t("signupsChart")} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">{t("transactionsChart")}</h3>
          <DayBarChart data={data.transactionsByDay} slot={3} locale={locale} summary={t("transactionsChart")} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">{t("signInMethods")}</h3>
          <CountBars
            slot={1}
            locale={locale}
            emptyLabel={t("noData")}
            rows={[
              { label: t("methodPassword"), value: users.withPassword },
              { label: t("methodGoogle"), value: users.withGoogle },
            ]}
          />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">{t("walletTypes")}</h3>
          <CountBars
            slot={4}
            locale={locale}
            emptyLabel={t("noData")}
            rows={data.walletsByType.map((w) => ({ label: tWalletTypes(w.type), value: w.count }))}
          />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">{t("transactionTypes")}</h3>
          <CountBars
            slot={2}
            locale={locale}
            emptyLabel={t("noData")}
            rows={data.transactionsByKind.map((k) => ({ label: kindLabel[k.kind] ?? k.kind, value: k.count }))}
          />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">{t("topCategories")}</h3>
          <CountBars
            slot={5}
            locale={locale}
            emptyLabel={t("noData")}
            rows={data.topCategories.map((c) => ({ label: tCategories(c.category), value: c.count }))}
          />
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-text-primary">{t("featureSummary")}</h3>
          <Link href="/admin/feature-requests" className="text-[13px] font-medium text-brand hover:underline">
            {t("manageRequests")} →
          </Link>
        </div>
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-text-secondary">
          <span>{t("totalRequests", { count: features.total })}</span>
          <span>{t("totalLikes", { count: features.votes })}</span>
          {features.byStatus.map((s) => (
            <span key={s.status}>
              {tFeatures(s.status)} {n(s.count)}
            </span>
          ))}
        </div>
        {features.top.length === 0 ? (
          <p className="text-[13px] text-text-muted">{t("noRequests")}</p>
        ) : (
          <ol className="flex flex-col divide-y divide-border">
            {features.top.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-2 text-[13.5px]">
                <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-text-primary">{n(f.votes)}</span>
                <span className="min-w-0 flex-1 truncate text-text-secondary">{f.title}</span>
                <FeatureStatusBadge status={f.status} />
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
