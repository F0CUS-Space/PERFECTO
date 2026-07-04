import { PromotionsManager } from "@/features/admin/components/promotions-manager";
import { getAdminPromotions } from "@/features/admin/queries";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Promotions — Admin" };

export default async function AdminPromotionsPage() {
  await requireAdmin();
  const promotions = await getAdminPromotions();

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Promotions</h1>
      <p className="mt-2 text-muted-foreground">
        Create, publish, edit, deactivate, or delete offers. Customers are notified when a
        promotion is published or re-activated.
      </p>
      <div className="mt-8">
        <PromotionsManager promotions={promotions} />
      </div>
    </div>
  );
}
