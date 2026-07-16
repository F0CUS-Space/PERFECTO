import Link from "next/link";
import { AlertTriangle, Calendar, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardRecentBookings } from "@/features/dashboard/components/dashboard-recent-bookings";
import { getCustomerDashboardStats } from "@/features/dashboard/queries";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const displayName = user.firstName ?? "there";
  const showEmailCaution = user.email && !user.emailVerifiedAt;
  const showAddEmailCaution = !user.email;

  let stats = {
    upcomingCount: 0,
    totalBookings: 0,
    pendingDepositCount: 0,
    recentBookings: [] as Awaited<ReturnType<typeof getCustomerDashboardStats>>["recentBookings"],
  };

  try {
    stats = await getCustomerDashboardStats(user.id);
  } catch (error) {
    console.error("[dashboard/overview]", error);
  }

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Hi, {displayName}</h1>
      <p className="mt-2 text-muted-foreground">Manage your bookings, payments, and profile.</p>

      {showAddEmailCaution ? (
        <div className="mt-6 flex gap-3 rounded-2xl border border-brand-blue/20 bg-brand-blue/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
          <div>
            <p className="font-medium text-brand-navy">Add an email (optional)</p>
            <p className="mt-1 text-muted-foreground">
              Email helps with receipts and account recovery.{" "}
              <Link href="/dashboard/profile" className="text-brand-blue hover:underline">
                Update profile
              </Link>
            </p>
          </div>
        </div>
      ) : null}

      {showEmailCaution ? (
        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-brand-navy">Verify your email when ready</p>
            <p className="mt-1 text-muted-foreground">
              Email verification is optional. Update your profile to add or change {user.email} for
              receipts.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Calendar,
            label: "Upcoming",
            value: stats.upcomingCount,
            href: "/dashboard/bookings",
          },
          {
            icon: CreditCard,
            label: "Pending payments",
            value: stats.pendingDepositCount,
            href: "/dashboard/payments",
          },
          {
            icon: Calendar,
            label: "Total bookings",
            value: stats.totalBookings,
            href: "/dashboard/bookings",
          },
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

      {stats.recentBookings.length > 0 ? (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-brand-navy">Recent bookings</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/bookings">View all</Link>
            </Button>
          </div>
          <div className="grid gap-4">
            <DashboardRecentBookings bookings={stats.recentBookings} />
          </div>
        </section>
      ) : (
        <section className="mt-10 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No bookings yet.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/contact?intent=estimate">Get estimate</Link>
            </Button>
          </div>
        </section>
      )}

      {stats.recentBookings.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/contact?intent=estimate">Get another estimate</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
