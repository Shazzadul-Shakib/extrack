/** One shared splash for the whole app. Anything that is "still loading" holds it open; when the
 *  last hold is released the progress bar fills to 100% and the splash fades out — so it plays
 *  exactly once per wait, however short or long that wait is. */
type SplashState = { visible: boolean; progress: number; fading: boolean; run: number };

const MIN_VISIBLE_MS = 900;
const INITIAL: SplashState = { visible: true, progress: 0, fading: false, run: 0 };

let state = INITIAL;
let holds = 1; // the document load itself
let initialHeld = true;
let shownAt = 0;
let ticker: ReturnType<typeof setInterval> | null = null;
let timers: ReturnType<typeof setTimeout>[] = [];
const listeners = new Set<() => void>();

function set(patch: Partial<SplashState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function startTicker() {
  if (ticker) return;
  ticker = setInterval(() => {
    if (state.visible && !state.fading) set({ progress: state.progress + (90 - state.progress) * 0.06 });
  }, 100);
}

function stopTicker() {
  if (ticker) clearInterval(ticker);
  ticker = null;
}

function finishIfIdle() {
  if (holds > 0) return;
  clearTimers();
  const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
  timers.push(
    setTimeout(() => {
      stopTicker();
      set({ progress: 100 });
      timers.push(setTimeout(() => set({ fading: true }), 350));
      timers.push(setTimeout(() => set({ visible: false }), 650));
    }, wait),
  );
}

export function subscribeSplash(listener: () => void) {
  listeners.add(listener);
  if (state.visible && !shownAt) shownAt = Date.now();
  if (state.visible) startTicker();
  return () => {
    listeners.delete(listener);
  };
}

export const getSplashState = () => state;
export const getServerSplashState = () => INITIAL;

export function acquireSplash(): () => void {
  holds++;
  clearTimers();
  if (!state.visible) {
    shownAt = Date.now();
    set({ visible: true, fading: false, progress: 0, run: state.run + 1 });
  } else if (state.fading || state.progress >= 100) {
    set({ fading: false });
  }
  startTicker();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds--;
    finishIfIdle();
  };
}

/** Releases the hold taken for the initial document load (idempotent). */
export function releaseInitialSplash() {
  if (!initialHeld) return;
  initialHeld = false;
  holds--;
  finishIfIdle();
}
