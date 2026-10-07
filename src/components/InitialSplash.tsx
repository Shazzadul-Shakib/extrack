"use client";

import { useEffect, useSyncExternalStore } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import {
  getServerSplashState,
  getSplashState,
  releaseInitialSplash,
  subscribeSplash,
} from "@/components/splashStore";

/** The single splash instance, mounted once in the root layout. It is in the server-rendered HTML
 *  so it paints immediately, and stays until the page has loaded and no route is still pending. */
export function InitialSplash() {
  const s = useSyncExternalStore(subscribeSplash, getSplashState, getServerSplashState);

  useEffect(() => {
    function release() {
      // A server-rendered Suspense fallback means the route is still streaming in; its own
      // signal releases the splash when it goes away.
      if (!document.querySelector("[data-splash-pending]")) releaseInitialSplash();
    }
    if (document.readyState === "complete") {
      release();
      return;
    }
    window.addEventListener("load", release);
    return () => window.removeEventListener("load", release);
  }, []);

  if (!s.visible) return null;
  return <SplashScreen key={s.run} progress={s.progress} fading={s.fading} />;
}
