"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Calendar,
  CreditCard,
  DollarSign,
  Minus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  formatPercentChange,
  type AdminStatsPeriod,
} from "@/features/admin/stats-period";
import type { AdminDashboardStats, AdminStatMetric } from "@/features/admin/types";
import { formatCurrency, cn } from "@/lib/utils";

const PERIOD_OPTIONS: { value: AdminStatsPeriod; label: string }[] = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "1 week" },
  { value: "30d", label: "1 month" },
  { value: "365d", label: "1 year" },
];

function TrendBadge({
  metric,
  comparisonLabel,
}: {
  metric: AdminStatMetric;
  comparisonLabel: string;
}) {
  const text = formatPercentChange(metric.changePercent);
  const isUp = metric.changePercent !== null && metric.changePercent > 0;
  const isDown = metric.changePercent !== null && metric.changePercent < 0;
  const isFlat = metric.changePercent === null || metric.changePercent === 0;

  return (
    <p
      className={cn(
        "mt-2 flex items-center gap-1 text-xs font-medium",
        isUp && "text-brand-green",
        isDown && "text-destructive",
        isFlat && "text-muted-foreground",
      )}
    >
      {isUp && <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />}
      {isDown && <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />}
      {isFlat && <Minus className="h-3.5 w-3.5 shrink-0" />}
      <span>
        {text} {comparisonLabel}
      </span>
    </p>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  metric,
  comparisonLabel,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  metric: AdminStatMetric;
  comparisonLabel: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-soft"
    >
      <Icon className="h-5 w-5 text-brand-green" />
      <p className="mt-3 text-2xl font-bold tabular-nums text-brand-navy">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      <TrendBadge metric={metric} comparisonLabel={comparisonLabel} />
    </Link>
  );
}

export function AdminStatsCards({ stats }: { stats: AdminDashboardStats }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setPeriod = (period: AdminStatsPeriod) => {
    const params = new URLSearchParams(searchParams.toString());
    if (period === "24h") {
      params.delete("period");
    } else {
      params.set("period", period);
    }
    const query = params.toString();
    router.push(query ? `/admin?${query}` : "/admin");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing data for <span className="font-medium text-brand-navy">{stats.periodLabel}</span>
        </p>
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-secondary/30 p-1">
          {PERIOD_OPTIONS.map(({ value, label }) => {
            const active = stats.period === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-blue text-white shadow-sm"
                    : "text-muted-foreground hover:bg-background hover:text-brand-navy",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={Calendar}
          label="New bookings"
          value={String(stats.bookings.value)}
          metric={stats.bookings}
          comparisonLabel={stats.comparisonLabel}
          href="/admin/bookings"
        />
        <StatCard
          icon={CreditCard}
          label="Pending payment"
          value={String(stats.pendingPayment.value)}
          metric={stats.pendingPayment}
          comparisonLabel={stats.comparisonLabel}
          href="/admin/bookings?status=PENDING_PAYMENT"
        />
        <StatCard
          icon={Users}
          label="New customers"
          value={String(stats.customers.value)}
          metric={stats.customers}
          comparisonLabel={stats.comparisonLabel}
          href="/admin/customers"
        />
        <StatCard
          icon={Briefcase}
          label="Open applications"
          value={String(stats.openApplications.value)}
          metric={stats.openApplications}
          comparisonLabel={stats.comparisonLabel}
          href="/admin/applications"
        />
        <StatCard
          icon={DollarSign}
          label="Revenue collected"
          value={formatCurrency(stats.revenue.value)}
          metric={stats.revenue}
          comparisonLabel={stats.comparisonLabel}
          href="/admin/payments"
        />
      </div>
    </div>
  );
}
