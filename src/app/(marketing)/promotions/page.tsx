import Link from "next/link";
import { Tag, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/shared/section";
import { PageHero } from "@/components/shared/page-hero";
import { getActivePromotions } from "@/features/promotions/queries";

export const metadata = {
  title: "Promotions",
  description: "Current offers and promotions from Perfecto Cleaning Services.",
};

export default async function PromotionsPage() {
  const promotions = await getActivePromotions();

  return (
    <>
      <PageHero
        eyebrow={
          <>
            <Tag className="h-3.5 w-3.5" /> Latest Deals
          </>
        }
        title="Offers & promotions"
        description="Claim an offer and ask our team to apply it when they prepare your estimate."
      />

      <Section>
        {promotions.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-brand-green" />
            <h2 className="mt-4 text-lg font-semibold text-brand-navy">No active promotions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back soon — or request an estimate for a personalized quote.
            </p>
            <Button asChild className="mt-5">
              <Link href="/contact?intent=estimate">Get estimate</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card"
              >
                <div className="flex items-center justify-between gap-3 bg-brand-navy px-6 py-4 text-white">
                  <div className="flex items-center gap-3">
                    <Tag className="h-5 w-5 text-brand-mint" />
                    <h2 className="text-lg font-semibold">{promo.title}</h2>
                  </div>
                  <Badge variant="secondary" className="bg-white/15 text-white hover:bg-white/15">
                    {promo.discountLabel}
                  </Badge>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="flex-1 text-sm text-muted-foreground">{promo.description}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {promo.appliesToAllServices
                      ? "Applies to all services"
                      : `Applies to: ${promo.serviceNames.join(", ")}`}
                  </p>
                  <Button asChild className="mt-5 w-fit">
                    <Link href="/contact?intent=estimate">Get estimate</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
