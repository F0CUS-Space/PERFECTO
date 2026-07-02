import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AddOnsManager } from "@/features/admin/components/addons-manager";
import { getAdminAddOns } from "@/features/admin/queries";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Add-ons — Admin" };

export default async function AdminAddOnsPage() {
  await requireAdmin();
  const addOns = await getAdminAddOns();

  return (
    <div className="container py-8 md:py-12">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/services">← Back to services</Link>
      </Button>

      <h1 className="text-3xl font-bold text-brand-navy">Add-ons</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Add-ons appear in the booking calculator. Link them to each service from the service
        detail page.
      </p>

      <div className="mt-8">
        <AddOnsManager addOns={addOns} />
      </div>
    </div>
  );
}
