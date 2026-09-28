"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ThumbsUp, Trash2 } from "lucide-react";
import { deleteFeatureRequestAction, updateFeatureStatusAction } from "@/app/actions/features";
import { Button, Card, Select } from "@/components/ui";
import { FEATURE_STATUSES } from "@/lib/featureConstants";
import { formatDate, formatNumber } from "@/lib/format";
import type { AdminFeatureRequest } from "@/lib/admin";
import type { FeatureStatus } from "@/lib/types";

export function AdminFeatureRow({ request }: { request: AdminFeatureRequest }) {
  const t = useTranslations("Admin");
  const tStatus = useTranslations("Features.status");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-[14.5px] font-semibold text-text-primary">{request.title}</h4>
          <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-text-muted">
            <ThumbsUp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {formatNumber(request.votes, locale)}
          </span>
        </div>
        {request.description && (
          <p className="mt-1 whitespace-pre-line break-words text-[13.5px] text-text-secondary">{request.description}</p>
        )}
        <p className="mt-2 text-[12.5px] text-text-muted">
          {request.authorName} · {request.authorEmail} · {formatDate(request.createdAt.slice(0, 10), locale)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Select
          value={request.status}
          disabled={pending}
          onChange={(e) => {
            const status = e.target.value as FeatureStatus;
            startTransition(async () => {
              await updateFeatureStatusAction(request.id, status);
            });
          }}
          className="w-36"
          aria-label={t("statusLabel")}
        >
          {FEATURE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {tStatus(status)}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={pending}
          aria-label={t("deleteRequest")}
          onClick={() => {
            if (!window.confirm(t("deleteConfirm"))) return;
            startTransition(async () => {
              await deleteFeatureRequestAction(request.id);
            });
          }}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </Button>
      </div>
    </Card>
  );
}
