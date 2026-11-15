"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Modal } from "@/components/Modal";
import { LinkButton, Button } from "@/components/ui";
import { Logomark } from "@/components/Logomark";
import { usePathname } from "@/i18n/navigation";
import { useInstalledOnDevice, useIsStandalone } from "@/hooks/usePwaInstall";

const KEY = "extrack_install_promo_dismissed";

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Once per browser session (a fresh start shows it again), nudges visitors to install the app. */
export function InstallPromo() {
  const t = useTranslations("Download");
  const pathname = usePathname();
  const standalone = useIsStandalone();
  const installed = useInstalledOnDevice();
  // Server snapshot is `true` so nothing renders during SSR/hydration.
  const dismissedBefore = useSyncExternalStore(() => () => {}, readDismissed, () => true);
  const [closed, setClosed] = useState(false);
  const [ready, setReady] = useState(false);

  // Wait until the page has really loaded: the window `load` event, then the brand splash (the route's
  // Suspense fallback) gone, then a short beat so the popup doesn't land on top of the page appearing.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const splashShowing = () => !!document.querySelector('[role="status"][aria-label="Loading"]');
    const check = () => {
      if (cancelled) return;
      if (splashShowing()) timer = setTimeout(check, 300);
      else timer = setTimeout(() => !cancelled && setReady(true), 800);
    };
    if (document.readyState === "complete") check();
    else window.addEventListener("load", check, { once: true });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("load", check);
    };
  }, []);

  function close() {
    setClosed(true);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* storage blocked — it simply shows again next page load */
    }
  }

  const open = ready && !standalone && !installed && !dismissedBefore && !closed && pathname !== "/download-app";
  if (!open) return null;

  return (
    <Modal open onClose={close} title={t("promoTitle")}>
      <div className="flex flex-col items-center gap-4 text-center">
        <Logomark />
        <p className="text-sm text-text-secondary">{t("promoBody")}</p>
        <div className="flex w-full flex-col gap-2">
          <LinkButton href="/download-app" size="lg" className="w-full" onClick={close}>
            <Download className="h-5 w-5" strokeWidth={2} />
            {t("button")}
          </LinkButton>
          <Button variant="ghost" onClick={close}>
            {t("promoLater")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
