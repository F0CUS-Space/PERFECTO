"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Calendar,
  CreditCard,
  LayoutDashboard,
  Package,
  Puzzle,
  Shield,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/bookings", label: "Bookings", icon: Calendar, exact: false },
  { href: "/admin/customers", label: "Customers", icon: Users, exact: false },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, exact: false },
  { href: "/admin/services", label: "Services", icon: Package, exact: false },
  { href: "/admin/add-ons", label: "Add-ons", icon: Puzzle, exact: false },
  { href: "/admin/applications", label: "Applications", icon: Briefcase, exact: false },
  { href: "/admin/team", label: "Team", icon: Shield, exact: false },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1">
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-blue text-white shadow-card"
                : "text-muted-foreground hover:bg-brand-blue/10 hover:text-brand-navy",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
