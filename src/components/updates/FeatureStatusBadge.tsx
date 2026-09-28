import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui";
import type { FeatureStatus } from "@/lib/types";

const VARIANT: Record<FeatureStatus, "neutral" | "brand" | "good" | "critical"> = {
  open: "neutral",
  planned: "brand",
  in_progress: "brand",
  shipped: "good",
  declined: "critical",
};

export function FeatureStatusBadge({ status }: { status: FeatureStatus }) {
  const t = useTranslations("Features.status");
  return <Badge variant={VARIANT[status]}>{t(status)}</Badge>;
}
