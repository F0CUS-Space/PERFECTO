import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ServiceCreateForm } from "@/features/admin/components/service-create-form";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "New service — Admin" };

export default async function AdminNewServicePage() {
  await requireAdmin();

  return (
    <div className="container py-8 md:py-12">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/services">← Back to services</Link>
      </Button>

      <h1 className="text-3xl font-bold text-brand-navy">Add service</h1>
      <p className="mt-2 text-muted-foreground">
        New services appear in Book Now once marked active.
      </p>

      <div className="mt-8">
        <ServiceCreateForm />
      </div>
    </div>
  );
}
