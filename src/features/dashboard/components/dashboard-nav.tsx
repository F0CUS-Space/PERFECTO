"use client";

import { Calendar, CreditCard, LayoutDashboard, User } from "lucide-react";

import {
  PortalMobileNav,
  PortalSidebar,
  type PortalNavGroup,
} from "@/components/shared/portal-sidebar";

export const DASHBOARD_NAV_GROUPS: PortalNavGroup[] = [
  {
    label: "Account",
    links: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/profile", label: "Profile", icon: User },
    ],
  },
  {
    label: "Activity",
    links: [
      { href: "/dashboard/bookings", label: "Bookings", icon: Calendar },
      { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
    ],
  },
];

export function DashboardMobileNav() {
  return <PortalMobileNav groups={DASHBOARD_NAV_GROUPS} />;
}

export function DashboardSidebar() {
  return <PortalSidebar groups={DASHBOARD_NAV_GROUPS} title="Dashboard navigation" />;
}

/** @deprecated Use DashboardMobileNav or DashboardSidebar */
export function DashboardNav() {
  return (
    <>
      <DashboardMobileNav />
      <DashboardSidebar />
    </>
  );
}
