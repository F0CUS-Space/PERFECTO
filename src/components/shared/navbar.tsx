"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AuthNavActions } from "@/features/auth/auth-nav-actions";
import { LogoutButton } from "@/features/auth/logout-button";
import { useAuthUser } from "@/features/auth/use-auth-user";

const MAIN_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Quote", href: "/quote" },
  { label: "Gallery", href: "/gallery" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const MORE_LINKS = [
  { label: "Testimonials", href: "/testimonials" },
  { label: "FAQ", href: "/faq" },
  { label: "Promotions", href: "/promotions" },
  { label: "Careers", href: "/careers" },
];

export function Navbar() {
  const pathname = usePathname();
  const authUser = useAuthUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close menus on route change.
  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  // Close the "More" dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Prevent body scroll when the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/perfecto-logo.png"
            alt="Perfecto Cleaning Services"
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
            priority
          />
          <span className="text-lg font-bold tracking-tight text-brand-navy">Perfecto</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {MAIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium transition-all",
                isActive(link.href)
                  ? "bg-brand-blue text-white shadow-card"
                  : "text-muted-foreground hover:bg-brand-blue/10 hover:text-brand-navy",
              )}
            >
              {link.label}
            </Link>
          ))}

          <div ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              className={cn(
                "flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-all",
                MORE_LINKS.some((l) => isActive(l.href))
                  ? "bg-brand-blue text-white shadow-card"
                  : "text-muted-foreground hover:bg-brand-blue/10 hover:text-brand-navy",
              )}
            >
              More
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", moreOpen && "rotate-180")}
              />
            </button>
            {moreOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-soft"
              >
                {MORE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    aria-current={isActive(link.href) ? "page" : undefined}
                    className={cn(
                      "block rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      isActive(link.href)
                        ? "bg-brand-blue text-white"
                        : "text-muted-foreground hover:bg-secondary hover:text-brand-navy",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </nav>

        {/* Desktop CTAs */}
        <AuthNavActions />

        {/* Mobile toggle */}
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-brand-navy lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 top-16 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-brand-navy/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute inset-x-0 top-0 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border bg-background p-5 shadow-soft">
            <div className="flex flex-col gap-1">
              {[...MAIN_LINKS, ...MORE_LINKS].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={cn(
                    "rounded-xl px-4 py-3 text-base font-medium transition-colors",
                    isActive(link.href)
                      ? "bg-brand-blue text-white shadow-card"
                      : "text-foreground/80 hover:bg-secondary",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
              {authUser ? (
                <>
                  <Button asChild variant="outline" size="lg">
                    <Link href={authUser.role === "ADMIN" ? "/admin" : "/dashboard"}>
                      {authUser.role === "ADMIN" ? "Admin" : "Dashboard"}
                    </Link>
                  </Button>
                  <LogoutButton variant="outline" />
                </>
              ) : (
                <>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/register">Sign Up</Link>
                  </Button>
                </>
              )}
              <Button asChild size="lg">
                <Link href="/book">Book Now</Link>
              </Button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
