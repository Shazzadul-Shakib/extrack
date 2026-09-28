import { getLocale, getTranslations } from "next-intl/server";
import { Lightbulb } from "lucide-react";
import { EmptyState, Card } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { FeatureRequest } from "@/lib/types";
import { LikeButton } from "./LikeButton";
import { FeatureStatusBadge } from "./FeatureStatusBadge";

export async function FeatureRequestList({ requests }: { requests: FeatureRequest[] }) {
  const [t, locale] = await Promise.all([getTranslations("Features"), getLocale()]);

  if (requests.length === 0) {
    return <EmptyState icon={Lightbulb} title={t("emptyTitle")} description={t("emptyDesc")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((request) => (
        <Card key={request.id} className="flex gap-4 p-4">
          <LikeButton id={request.id} liked={request.liked} votes={request.votes} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-[14.5px] font-semibold text-text-primary">{request.title}</h4>
              <FeatureStatusBadge status={request.status} />
            </div>
            {request.description && (
              <p className="mt-1 whitespace-pre-line break-words text-[13.5px] text-text-secondary">{request.description}</p>
            )}
            <p className="mt-2 text-[12.5px] text-text-muted">
              {request.mine ? t("byYou") : t("byName", { name: request.authorName })} · {formatDate(request.createdAt.slice(0, 10), locale)}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
