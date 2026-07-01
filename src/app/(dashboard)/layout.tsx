import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/features/auth/logout-button";
import { requireUser } from "@/server/rbac";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireUser().catch(() => redirect("/login?next=/dashboard"));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="text-sm font-bold text-brand-navy">
            Perfecto
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-medium text-brand-navy">
              Dashboard
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
