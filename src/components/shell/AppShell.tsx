"use client";

import { useState } from "react";
import { useScrollLock } from "@/components/useScrollLock";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useFormStatus } from "react-dom";
import { Calculator, Loader2, LogOut, Menu, Settings } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { logoutAction } from "@/app/actions/auth";
import type { PublicUser } from "@/lib/types";
import { cx } from "@/components/ui";
import { Logomark } from "@/components/Logomark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { FloatingCalculator } from "@/components/calculator/FloatingCalculator";

function LogoutButton() {
  const t = useTranslations("Nav");
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-status-critical disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-4.5 w-4.5 animate-spin" strokeWidth={2} /> : <LogOut className="h-4.5 w-4.5" strokeWidth={2} />}
      {pending ? t("loggingOut") : t("logOut")}
    </button>
  );
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** "updates" lives in its own footer link near the profile/logout area instead, not the main list; "admin" is only listed for admins. */
const MAIN_NAV_ITEMS = NAV_ITEMS.filter((item) => item.key !== "updates" && item.key !== "admin");
const ADMIN_ITEM = NAV_ITEMS.find((item) => item.key === "admin")!;
const UPDATES_ITEM = NAV_ITEMS.find((item) => item.key === "updates")!;

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: (typeof NAV_ITEMS)[number];
  pathname: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Nav");
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cx(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-brand-soft text-brand"
          : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
      )}
    >
      <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={2} />
      {t(item.key)}
    </Link>
  );
}

function NavLinks({
  pathname,
  isAdmin,
  onNavigate,
}: {
  pathname: string;
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {MAIN_NAV_ITEMS.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
      ))}
      {isAdmin && <NavLink item={ADMIN_ITEM} pathname={pathname} onNavigate={onNavigate} />}
    </nav>
  );
}

function SidebarContent({
  user,
  pathname,
  onNavigate,
}: {
  user: PublicUser;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2 px-2 pt-1">
        <Logomark size="sm" />
        <span className="text-base font-semibold text-text-primary">
          Extrack
        </span>
      </Link>
      <NavLinks pathname={pathname} isAdmin={user.isAdmin} onNavigate={onNavigate} />
      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
        <NavLink item={UPDATES_ITEM} pathname={pathname} onNavigate={onNavigate} />
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13px] font-semibold text-text-secondary">
            {initials(user.name) || "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-text-primary">
              {user.name}
            </p>
            <p className="truncate text-[12px] text-text-muted">{user.email}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <LogoutButton />
        </form>
      </div>
    </div>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: PublicUser;
  children: React.ReactNode;
}) {
  const t = useTranslations("Nav");
  const tCommon = useTranslations("Common");
  const tSettings = useTranslations("Settings");
  const tCalculator = useTranslations("Calculator");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  useScrollLock(mobileOpen);
  const activeItem = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-border bg-surface md:block">
        <SidebarContent user={user} pathname={pathname} />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-surface shadow-xl animate-fade-in">
            <SidebarContent
              user={user}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div data-scroll-root className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2 md:hidden"
            aria-label={t("openNavigation")}
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>
          <h1 className="text-sm font-semibold text-text-primary">
            {activeItem ? t(activeItem.key) : tCommon("brand")}
          </h1>
          <button
            type="button"
            onClick={() => setCalcOpen((v) => !v)}
            aria-label={tCalculator("openCalculator")}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2"
          >
            <Calculator className="h-5 w-5" strokeWidth={2} />
          </button>
          <Link
            href="/settings"
            aria-label={tSettings("openSettings")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2"
          >
            <Settings className="h-5 w-5" strokeWidth={2} />
          </Link>
          <LanguageSwitcher />
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-350">{children}</div>
        </main>
      </div>
      <FloatingCalculator open={calcOpen} onClose={() => setCalcOpen(false)} />
    </div>
  );
}
