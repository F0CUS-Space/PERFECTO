import nextDynamic from "next/dynamic";

import { getAdminPromotions, getAdminServicePickerOptions } from "@/features/admin/queries";

const PromotionsManager = nextDynamic(
  () =>
    import("@/features/admin/components/promotions-manager").then((mod) => ({
      default: mod.PromotionsManager,
    })),
  {
    loading: () => (
      <div className="flex items-center gap-2 py-12 text-muted-foreground">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
        Loading promotions…
      </div>
    ),
  },
);

export const dynamic = "force-dynamic";

export const metadata = { title: "Promotions — Admin" };

export default async function AdminPromotionsPage() {
  const [promotions, services] = await Promise.all([
    getAdminPromotions(),
    getAdminServicePickerOptions(),
  ]);

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Promotions</h1>
      <p className="mt-2 text-muted-foreground">
        Create flat or percentage discounts, limit them to specific services, and publish when ready.
        Claimed promotions reduce the customer&apos;s booking total.
      </p>
      <div className="mt-8">
        <PromotionsManager promotions={promotions} services={services} />
      </div>
    </div>
  );
}
