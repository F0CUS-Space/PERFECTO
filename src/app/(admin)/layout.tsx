import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/features/auth/logout-button";
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
      <header className="border-b border-border bg-brand-navy text-white">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/admin" className="text-sm font-bold">
            Perfecto Admin
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/" className="text-sm text-white/80 hover:text-white">
              Website
            </Link>
            <LogoutButton variant="ghost" className="text-white/90 hover:bg-white/10 hover:text-white" />
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
