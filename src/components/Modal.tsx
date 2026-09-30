"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cx } from "@/components/cx";

const noopSubscribe = () => () => {};

// Portals must not render during SSR/hydration — this reads `false` on the server
// and the first client pass, then `true` once mounted, without the extra
// render-triggering setState an effect would need for the same result.
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  fullScreenOnMobile = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  fullScreenOnMobile?: boolean;
}) {
  const t = useTranslations("Common");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mounted = useMounted();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!mounted) return null;

  // React re-dispatches native events (close/cancel/click) along the React tree,
  // not the DOM tree — so a nested modal's dialog, despite portaling to a DOM
  // sibling of this one, is still a React descendant and its close/cancel events
  // would otherwise bubble up here too. Guard every handler to the dialog's own
  // native target so one modal closing never closes an ancestor modal.
  const own = (fn: () => void) => (e: { target: EventTarget | null }) => {
    if (e.target === dialogRef.current) fn();
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      onClose={own(onClose)}
      onCancel={own(onClose)}
      onClick={own(onClose)}
      className={cx(
        "m-auto border border-border bg-surface p-0 text-text-primary backdrop:bg-transparent",
        fullScreenOnMobile
          ? "h-dvh max-h-none w-screen max-w-none rounded-none border-0 sm:h-auto sm:max-h-[calc(100%-2em)] sm:w-[min(520px,92vw)] sm:max-w-[calc(100%-6px-2em)] sm:rounded-lg sm:border"
          : "w-[min(520px,92vw)] rounded-lg",
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {open && (
        <div className={cx("animate-fade-in", fullScreenOnMobile && "flex h-full flex-col sm:block sm:h-auto")}>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-[15px] font-semibold text-text-primary">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text-primary"
            >
              <X className="h-4.5 w-4.5" strokeWidth={2} />
            </button>
          </div>
          <div
            className={cx(
              "overflow-y-auto px-5 py-5",
              fullScreenOnMobile ? "min-h-0 flex-1 sm:max-h-[75vh] sm:flex-none" : "max-h-[75vh]",
            )}
          >
            {children}
          </div>
        </div>
      )}
    </dialog>,
    document.body,
  );
}
