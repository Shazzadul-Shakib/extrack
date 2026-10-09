/** Full-screen brand splash, used as the route's Suspense fallback (loading.tsx): it shows exactly
 *  as long as the page is loading and disappears when the real page replaces it. A plain dot
 *  morphs into the Extrack logomark. Pure CSS, no state. */
export function SplashScreen() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-page"
    >
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
