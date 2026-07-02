import Link from "next/link";

import { redirect } from "next/navigation";



import { BrandLogo } from "@/components/shared/brand-logo";

import { LogoutButton } from "@/features/auth/logout-button";

import { AdminNav } from "@/features/admin/components/admin-nav";

import { ForbiddenError, requireAdmin } from "@/server/rbac";



export default async function AdminLayout({ children }: { children: React.ReactNode }) {

  try {

    await requireAdmin();

  } catch (error) {

    if (error instanceof ForbiddenError) redirect("/dashboard");

    redirect("/login?next=/admin");

  }



  return (

    <div className="min-h-screen bg-background">

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-md">

        <div className="container flex h-16 items-center justify-between gap-4">

          <BrandLogo compact />

          <div className="flex items-center gap-2">

            <Link

              href="/"

              className="hidden text-sm text-muted-foreground hover:text-brand-navy sm:inline"

            >

              Website

            </Link>

            <LogoutButton variant="ghost" />

          </div>

        </div>

        <div className="container border-t border-border/60 pb-3 pt-1">

          <AdminNav />

        </div>

      </header>

      <main>{children}</main>

    </div>

  );

}

