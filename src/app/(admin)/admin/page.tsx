import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminStatsCards } from "@/features/admin/components/admin-stats-cards";
import { PaginatedAdminBookingsPreview } from "@/features/admin/components/paginated-lists";
import { getAdminBookings, getAdminDashboardStats } from "@/features/admin/queries";
import { parseAdminStatsPeriod, getPeriodRange } from "@/features/admin/stats-period";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function AdminPage({ searchParams }: PageProps) {
  const user = await requireAdmin();
  const { period: periodParam } = await searchParams;
  const period = parseAdminStatsPeriod(periodParam);
  const { start } = getPeriodRange(period);

  const [stats, recentBookings] = await Promise.all([
    getAdminDashboardStats(period),
    getAdminBookings({ since: start }),
  ]);

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Admin dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome back, {user.firstName ?? "Admin"}. Manage bookings, customers, and services.
      </p>

      <div className="mt-8">
        <Suspense fallback={null}>
          <AdminStatsCards stats={stats} />
        </Suspense>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-brand-navy">Recent bookings</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/bookings">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {recentBookings.length === 0 ? (
          <div className="rounded-2xl border border-border px-4 py-10 text-center text-muted-foreground">
            No bookings in this period.
          </div>
        ) : (
          <PaginatedAdminBookingsPreview bookings={recentBookings} />
        )}
      </section>
    </div>
  );
}
