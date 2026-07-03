"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface PortalNavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface PortalNavGroup {
  label: string;
  links: PortalNavLink[];
}

interface PortalSidebarProps {
  groups: PortalNavGroup[];
  title?: string;
  className?: string;
}

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function PortalSidebar({ groups, title, className }: PortalSidebarProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("space-y-6", className)} aria-label={title ?? "Portal navigation"}>
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.links.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(pathname, href, exact);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-blue text-white shadow-card"
                        : "text-muted-foreground hover:bg-brand-blue/10 hover:text-brand-navy",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Compact horizontal nav for small screens when sidebar is hidden. */
export function PortalMobileNav({ groups }: { groups: PortalNavGroup[] }) {
  const pathname = usePathname();
  const links = groups.flatMap((g) => g.links);

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 lg:hidden" aria-label="Portal navigation">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(pathname, href, exact);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
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
