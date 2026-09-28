"use client";

import { useOptimistic, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ThumbsUp } from "lucide-react";
import { setFeatureVoteAction } from "@/app/actions/features";
import { cx } from "@/components/cx";
import { formatNumber } from "@/lib/format";

/**
 * The like toggle on a feature request. Flips instantly (optimistically) and settles on whatever
 * the server confirms — the page revalidates, so the real count arrives with the next render.
 */
export function LikeButton({ id, liked, votes }: { id: string; liked: boolean; votes: number }) {
  const t = useTranslations("Features");
  const locale = useLocale();
  const [, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic(
    { liked, votes },
    (current, nextLiked: boolean) => ({ liked: nextLiked, votes: current.votes + (nextLiked ? 1 : -1) })
  );

  function toggle() {
    const nextLiked = !state.liked;
    startTransition(async () => {
      setOptimistic(nextLiked);
      await setFeatureVoteAction(id, nextLiked);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={state.liked}
      aria-label={state.liked ? t("unlike") : t("like")}
      className={cx(
        "flex w-12 shrink-0 flex-col items-center gap-0.5 rounded-lg border py-2 text-[13px] font-semibold tabular-nums transition-colors",
        state.liked
          ? "border-brand bg-brand-soft text-brand"
          : "border-border bg-surface text-text-secondary hover:bg-surface-2 hover:text-text-primary",
      )}
    >
      <ThumbsUp className="h-4 w-4" strokeWidth={2} fill={state.liked ? "currentColor" : "none"} />
      {formatNumber(state.votes, locale)}
    </button>
  );
}
