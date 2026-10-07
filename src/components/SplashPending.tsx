"use client";

import { useEffect } from "react";
import { acquireSplash, releaseInitialSplash } from "@/components/splashStore";

/** Rendered as a route's Suspense fallback: keeps the splash open while it is mounted. */
export function SplashPending() {
  useEffect(() => {
    const release = acquireSplash();
    return () => {
      release();
      releaseInitialSplash();
    };
  }, []);
  return <div data-splash-pending hidden />;
}
