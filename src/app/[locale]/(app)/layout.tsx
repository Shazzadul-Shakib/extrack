import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/shell/AppShell";

// Everything in the signed-in app is private. Crawlers are sent to the login page anyway, but say so
// explicitly rather than letting these pages inherit "index, follow" and a canonical URL.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
