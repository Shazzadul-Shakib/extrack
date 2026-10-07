/** Full-screen brand splash: a top progress bar fills left to right (0–100%) while a plain dot morphs
 *  into the Extrack logomark. Pure CSS animation, so it works as a Suspense fallback and in
 *  server-rendered HTML before hydration. */
export function SplashScreen({ progress, fading = false }: { progress: number; fading?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-page transition-opacity duration-300`}
      style={{ opacity: fading ? 0 : 1, pointerEvents: fading ? "none" : "auto" }}
    >
      <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden bg-brand-soft">
        <div
          className="h-full w-full origin-left bg-brand transition-transform duration-200 ease-out"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>
      <div className="splash-tile flex h-20 w-20 items-center justify-center bg-brand text-brand-contrast">
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none">
          <path
            className="splash-line"
            pathLength={1}
            d="M5 17 L10.5 9.5 L14.5 14 L19 6 M19 6 L19 10.5 M19 6 L14.5 6"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
