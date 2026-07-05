import { redirect } from "next/navigation";

import { DashboardMobileNav, DashboardSidebar } from "@/features/dashboard/components/dashboard-nav";
import { NotificationBell } from "@/components/shared/notification-bell";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function DashboardSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return (
    <div className="border-t border-border bg-background">
      <div className="border-b border-border bg-secondary/30 px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <DashboardMobileNav />
          </div>
          <NotificationBell userId={user.id} />
        </div>
      </div>
      <div className="flex">
        <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-secondary/20 lg:block">
          <div className="sticky top-[var(--navbar-height,4rem)] max-h-[calc(100vh-var(--navbar-height,4rem))] overflow-y-auto p-4">
            <p className="mb-4 px-3 text-sm font-semibold text-brand-navy">My account</p>
            <DashboardSidebar />
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
