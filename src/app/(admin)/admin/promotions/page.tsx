import { PromotionsManager } from "@/features/admin/components/promotions-manager";
import { getAdminPromotions, getAdminServices } from "@/features/admin/queries";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Promotions — Admin" };

export default async function AdminPromotionsPage() {
  await requireAdmin();
  const [promotions, services] = await Promise.all([getAdminPromotions(), getAdminServices()]);

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Promotions</h1>
      <p className="mt-2 text-muted-foreground">
        Create flat or percentage discounts, limit them to specific services, and publish when ready.
        Claimed promotions reduce the customer&apos;s booking total.
      </p>
      <div className="mt-8">
        <PromotionsManager
          promotions={promotions}
          services={services.map((service) => ({ id: service.id, name: service.name }))}
        />
      </div>
    </div>
  );
}
