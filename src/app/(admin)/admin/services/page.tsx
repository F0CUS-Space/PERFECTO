import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AdminServiceCard } from "@/features/admin/components/admin-service-card";
import { getAdminServices } from "@/features/admin/queries";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Services — Admin" };

export default async function AdminServicesPage() {
  await requireAdmin();
  const services = await getAdminServices();

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-navy">Services</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your booking catalog — tap a service to edit details and add-ons.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/add-ons">Manage add-ons</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/services/new">Add service</Link>
          </Button>
        </div>
      </div>

      {services.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center text-muted-foreground">
          No services yet.{" "}
          <Link href="/admin/services/new" className="text-brand-blue hover:underline">
            Create your first service
          </Link>
          .
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <AdminServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
