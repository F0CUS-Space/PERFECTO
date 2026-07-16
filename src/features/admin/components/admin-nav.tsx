"use client";

import {
  Briefcase,
  Calendar,
  CalendarOff,
  ClipboardList,
  CreditCard,
  FileText,
  Gift,
  History,
  Images,
  LayoutDashboard,
  MessageSquare,
  Package,
  Puzzle,
  Shield,
  Users,
} from "lucide-react";

import {
  PortalMobileNav,
  PortalSidebar,
  type PortalNavGroup,
} from "@/components/shared/portal-sidebar";

export const ADMIN_NAV_GROUPS: PortalNavGroup[] = [
  {
    label: "Dashboard",
    links: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Operations",
    links: [
      { href: "/admin/bookings", label: "Bookings", icon: Calendar },
      { href: "/admin/estimates", label: "Estimates", icon: FileText },
      { href: "/admin/schedule", label: "Availability", icon: CalendarOff },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    label: "Catalog",
    links: [
      { href: "/admin/services", label: "Services", icon: Package },
      { href: "/admin/add-ons", label: "Add-ons", icon: Puzzle },
    ],
  },
  {
    label: "Content",
    links: [
      { href: "/admin/gallery", label: "Gallery", icon: Images },
      { href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
      { href: "/admin/promotions", label: "Promotions", icon: Gift },
    ],
  },
  {
    label: "Hiring",
    links: [
      { href: "/admin/jobs", label: "Job postings", icon: ClipboardList },
      { href: "/admin/applications", label: "Applications", icon: Briefcase },
    ],
  },
  {
    label: "Settings",
    links: [
      { href: "/admin/team", label: "Team & access", icon: Shield },
      { href: "/admin/audit-log", label: "Audit log", icon: History },
    ],
  },
];

export function AdminMobileNav() {
  return <PortalMobileNav groups={ADMIN_NAV_GROUPS} />;
}

export function AdminSidebar() {
  return <PortalSidebar groups={ADMIN_NAV_GROUPS} title="Admin navigation" />;
}

/** @deprecated Use AdminMobileNav or AdminSidebar */
export function AdminNav() {
  return (
    <>
      <AdminMobileNav />
      <AdminSidebar />
    </>
  );
}
