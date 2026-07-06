import Link from "next/link";

import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/shared/brand-logo";
import { NotificationBell } from "@/components/shared/notification-bell";
import { LogoutButton } from "@/features/auth/logout-button";
import { AdminMobileNav, AdminSidebar } from "@/features/admin/components/admin-nav";
import { ForbiddenError, requireAdmin } from "@/server/rbac";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof ForbiddenError) redirect("/dashboard");
    redirect("/login?next=/admin");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
          <BrandLogo compact />
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden text-sm text-muted-foreground hover:text-brand-navy sm:inline"
            >
              Website
            </Link>
            <NotificationBell firebaseUid={admin.firebaseUid} />
            <LogoutButton variant="ghost" />
          </div>
        </div>
        <div className="border-t border-border/60 px-4 pb-3 pt-2 md:hidden">
          <AdminMobileNav />
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-secondary/20 md:block">
          <div className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto p-4">
            <p className="mb-4 px-3 text-sm font-semibold text-brand-navy">Admin portal</p>
            <AdminSidebar />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
