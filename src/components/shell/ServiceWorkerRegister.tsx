"use client";

import { useEffect } from "react";

/** Registers the pass-through service worker that browsers require before offering "Install app". */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
  }, []);
  return null;
}
