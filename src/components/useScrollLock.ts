"use client";

import { useEffect } from "react";

// Ref-counted so nested overlays (e.g. a modal opened from the mobile sidebar) only
// release the page scroll once the last one closes.
let locks = 0;
let saved: { el: HTMLElement; overflow: string; paddingRight: string }[] = [];

// The app shell scrolls inside its own container (marked data-scroll-root) rather than the
// page, so both it and the body have to be locked.
function lock() {
  if (locks++ > 0) return;
  const targets = [document.body, ...document.querySelectorAll<HTMLElement>("[data-scroll-root]")];
  saved = targets.map((el) => {
    const record = { el, overflow: el.style.overflow, paddingRight: el.style.paddingRight };
    // Keep the layout from jumping sideways when the scrollbar disappears.
    const scrollbar = el.offsetWidth - el.clientWidth;
    el.style.overflow = "hidden";
    if (scrollbar > 0) el.style.paddingRight = `${scrollbar}px`;
    return record;
  });
}

function unlock() {
  if (--locks > 0) return;
  for (const { el, overflow, paddingRight } of saved) {
    el.style.overflow = overflow;
    el.style.paddingRight = paddingRight;
  }
  saved = [];
}

/** Stops the page behind an overlay (modal, drawer) from scrolling while `locked` is true. */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    lock();
    return unlock;
  }, [locked]);
}
