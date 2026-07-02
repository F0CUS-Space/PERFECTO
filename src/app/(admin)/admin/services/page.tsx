import { ServiceEditForm } from "@/features/admin/components/service-edit-form";
import { getAdminServices } from "@/features/admin/queries";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Services — Admin" };

export default async function AdminServicesPage() {
  await requireAdmin();
  const services = await getAdminServices();

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Services</h1>
      <p className="mt-2 text-muted-foreground">
        Update names, base prices, and visibility for the booking catalog.
      </p>

      {services.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center text-muted-foreground">
          No services in the catalog. Run the database seed to load defaults.
        </p>
      ) : (
        <div className="mt-8 grid gap-6">
          {services.map((service) => (
            <ServiceEditForm key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
