"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Chrome's `beforeinstallprompt` event — not in the standard DOM typings. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    /** Set by the inline script in the root layout's <head>, which catches the event before React loads. */
    __pwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

/** What this browser/device can do about installing. "unknown" only during SSR and hydration. */
export type InstallSupport = "unknown" | "installed" | "ios" | "inapp" | "insecure" | "unsupported" | "installable";

export type InstallStatus = "idle" | "preparing" | "prompting" | "installing" | "installed" | "cancelled" | "failed";

export const MAX_TRIES = 3;
const TRY_INTERVAL_MS = 1200;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectSupport(): InstallSupport {
  if (isStandalone()) return "installed";
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (iOS) return "ios";
  if (/FBAN|FBAV|FB_IAB|Instagram|Telegram|\bIMO\b|Line\/|Snapchat|TikTok|Messenger|; wv\)/i.test(ua)) return "inapp";
  if (!window.isSecureContext) return "insecure";
  // Chrome, Edge, Samsung Internet, Opera and Brave all carry "Chrome/" in their UA; Firefox and desktop Safari don't.
  if (!/Chrome\/|Chromium\//.test(ua) || /Firefox/.test(ua)) return "unsupported";
  return "installable";
}

const noopSubscribe = () => () => {};

// Remembers that this device has the app. Browser storage is shared between the browser and the installed
// app on Android and desktop Chrome/Edge, so a flag set from either side is seen by both.
const INSTALLED_FLAG = "extrack_pwa_installed";
const INSTALLED_EVENT = "extrack:pwa-installed-changed";

function readInstalledFlag(): boolean {
  try {
    return localStorage.getItem(INSTALLED_FLAG) === "1";
  } catch {
    return false;
  }
}

function writeInstalledFlag(value: boolean) {
  try {
    if (value) localStorage.setItem(INSTALLED_FLAG, "1");
    else localStorage.removeItem(INSTALLED_FLAG);
  } catch {
    /* storage blocked — detection just falls back to the API check each visit */
  }
  window.dispatchEvent(new Event(INSTALLED_EVENT));
}

function subscribeInstalledFlag(onChange: () => void) {
  window.addEventListener(INSTALLED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(INSTALLED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * True when Extrack is already installed on this device, even if we're viewing it in a normal browser tab.
 * Combines: running standalone, an `appinstalled` event seen earlier, and `getInstalledRelatedApps()`
 * (Chrome/Edge on Android and recent desktop; it also tells us when the app was uninstalled).
 * Server snapshot is `true` so nothing install-related flashes in before we know.
 */
export function useInstalledOnDevice(): boolean {
  const flag = useSyncExternalStore(subscribeInstalledFlag, readInstalledFlag, () => true);

  useEffect(() => {
    if (isStandalone()) {
      writeInstalledFlag(true);
      return;
    }
    const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> };
    nav
      .getInstalledRelatedApps?.()
      .then((apps) => {
        const installed = apps.length > 0;
        if (installed !== readInstalledFlag()) writeInstalledFlag(installed);
      })
      .catch(() => {});
  }, []);

  return flag;
}

/** Run at module scope-free: the snapshot is a primitive string, so React compares it by value. */
function useSupport(): InstallSupport {
  return useSyncExternalStore(noopSubscribe, detectSupport, () => "unknown");
}

/** True when running as the installed app. Server snapshot is `true` so install buttons never flash in. */
export function useIsStandalone(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(display-mode: standalone)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    isStandalone,
    () => true,
  );
}

export function usePwaInstall() {
  const detected = useSupport();
  const installedOnDevice = useInstalledOnDevice();
  const support: InstallSupport = detected === "unknown" ? "unknown" : installedOnDevice ? "installed" : detected;
  const [status, setStatus] = useState<InstallStatus>("idle");
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__pwaPrompt = e as BeforeInstallPromptEvent;
    };
    const onInstalled = () => {
      window.__pwaPrompt = null;
      writeInstalledFlag(true);
      setStatus("installed");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      // Browsers only honour an install request within ~5s of the tap, so the retries (3 × 1.2s) fit inside it.
      for (let i = 1; i <= MAX_TRIES; i++) {
        setAttempt(i);
        setStatus("preparing");
        const deadline = Date.now() + TRY_INTERVAL_MS;
        while (!window.__pwaPrompt && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 100));
        }
        const promptEvent = window.__pwaPrompt;
        if (!promptEvent) continue;

        window.__pwaPrompt = null; // single-use
        setStatus("prompting");
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        setStatus(outcome === "accepted" ? "installing" : "cancelled");
        return;
      }
      setStatus("failed");
    } catch {
      setStatus("failed");
    } finally {
      busy.current = false;
    }
  }, []);

  return { support, status, attempt, install };
}
