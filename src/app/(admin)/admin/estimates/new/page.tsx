import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EstimateCreateForm } from "@/features/estimates/components/estimate-create-form";
import { getEstimateCatalog } from "@/features/estimates/queries";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "New estimate — Admin" };

export default async function AdminNewEstimatePage() {
  await requireAdmin();
  const catalog = await getEstimateCatalog();

  return (
    <div className="container py-8 md:py-12">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/estimates">← Back to estimates</Link>
      </Button>

      <h1 className="text-3xl font-bold text-brand-navy">New estimate</h1>
      <p className="mt-2 text-muted-foreground">
        Set the service price and add-ons, then email a secure pay link to the customer.
      </p>

      <div className="mt-8">
        {catalog.length === 0 ? (
          <div className="rounded-2xl border border-border px-4 py-10 text-center text-muted-foreground">
            No active services available. Add a service first.
          </div>
        ) : (
          <EstimateCreateForm catalog={catalog} />
        )}
      </div>
    </div>
  );
}
