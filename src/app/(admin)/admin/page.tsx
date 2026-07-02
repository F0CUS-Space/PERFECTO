import Link from "next/link";
import { ArrowRight, Calendar, CreditCard, DollarSign, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getAdminBookings, getAdminStats } from "@/features/admin/queries";
import { formatCurrency } from "@/lib/utils";
import { requireAdmin } from "@/server/rbac";
import { BookingStatusBadge } from "@/features/dashboard/components/booking-status-badge";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const user = await requireAdmin();
  const [stats, recentBookings] = await Promise.all([
    getAdminStats(),
    getAdminBookings(),
  ]);

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Admin dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome back, {user.firstName ?? "Admin"}. Manage bookings, customers, and services.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Calendar, label: "Total bookings", value: stats.totalBookings, href: "/admin/bookings" },
          { icon: CreditCard, label: "Pending payment", value: stats.pendingPayment, href: "/admin/bookings?status=PENDING_PAYMENT" },
          { icon: Users, label: "Customers", value: stats.totalCustomers, href: "/admin/customers" },
          { icon: DollarSign, label: "Revenue collected", value: formatCurrency(stats.totalRevenue), href: "/admin/payments" },
        ].map(({ icon: Icon, label, value, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-soft"
          >
            <Icon className="h-5 w-5 text-brand-green" />
            <p className="mt-3 text-2xl font-bold text-brand-navy">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </Link>
        ))}
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
              {recentBookings.slice(0, 8).map((booking) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
