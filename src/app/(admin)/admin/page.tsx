import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminStatsCards } from "@/features/admin/components/admin-stats-cards";
import { getAdminBookings, getAdminDashboardStats } from "@/features/admin/queries";
import { parseAdminStatsPeriod, getPeriodRange } from "@/features/admin/stats-period";
import { formatCurrency } from "@/lib/utils";
import { requireAdmin } from "@/server/rbac";
import { BookingStatusBadge } from "@/features/dashboard/components/booking-status-badge";

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

        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Service</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Paid</th>
                <th className="px-4 py-3 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No bookings in this period.
                  </td>
                </tr>
              ) : (
                recentBookings.slice(0, 8).map((booking) => (
                  <tr key={booking.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium text-brand-navy">{booking.customerName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{booking.serviceName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(booking.scheduledDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <BookingStatusBadge status={booking.status} />
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrency(booking.amountPaid)} / {formatCurrency(booking.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/bookings/${booking.id}`} className="text-brand-blue hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
