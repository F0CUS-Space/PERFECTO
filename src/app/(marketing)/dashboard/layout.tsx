import { redirect } from "next/navigation";

import { DashboardNav } from "@/features/dashboard/components/dashboard-nav";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function DashboardSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return (
    <>
      <div className="border-b border-border bg-secondary/30">
        <div className="container py-3">
          <DashboardNav />
        </div>
      </div>
      {children}
    </>
  );
}
