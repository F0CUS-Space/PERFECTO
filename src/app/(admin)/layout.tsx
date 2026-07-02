import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, CreditCard, DollarSign, Users } from "lucide-react";

import { BrandLogo } from "@/components/shared/brand-logo";
import { LogoutButton } from "@/features/auth/logout-button";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { ForbiddenError, requireAdmin } from "@/server/rbac";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof ForbiddenError) redirect("/dashboard");
    redirect("/login?next=/admin");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-brand-navy text-white">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/admin" className="shrink-0 brightness-0 invert">
              <BrandLogo linked={false} compact />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden text-sm text-white/80 hover:text-white sm:inline">
              Website
            </Link>
            <LogoutButton
              variant="ghost"
              className="text-white/90 hover:bg-white/10 hover:text-white"
            />
          </div>
        </div>
        <div className="container pb-3">
          <AdminNav />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
