import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardNav } from "@/features/dashboard/components/dashboard-nav";
import { LogoutButton } from "@/features/auth/logout-button";
import { requireUser } from "@/server/rbac";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireUser().catch(() => redirect("/login?next=/dashboard"));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container py-3">
          <div className="flex h-10 items-center justify-between gap-4">
            <Link href="/" className="text-sm font-bold text-brand-navy">
              Perfecto
            </Link>
            <LogoutButton />
          </div>
          <DashboardNav />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
