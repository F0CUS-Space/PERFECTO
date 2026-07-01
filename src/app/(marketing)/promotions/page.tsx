import type { Metadata } from "next";
import Link from "next/link";
import { Tag, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Section } from "@/components/shared/section";
import { PageHero } from "@/components/shared/page-hero";
import { getActivePromotions } from "@/features/promotions/queries";

export const metadata: Metadata = {
  title: "Promotions",
  description: "Current offers and promotions from Perfecto Cleaning Services.",
};

export const dynamic = "force-dynamic";

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
        description="Make a spotless home even more rewarding with our latest deals."
      />

      <Section>
        {promotions.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-brand-green" />
            <h2 className="mt-4 text-lg font-semibold text-brand-navy">No active promotions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back soon — or get an instant quote to see today&apos;s pricing.
            </p>
            <Button asChild className="mt-5">
              <Link href="/book">Book Now</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card"
              >
                <div className="flex items-center gap-3 bg-brand-navy px-6 py-4 text-white">
                  <Tag className="h-5 w-5 text-brand-mint" />
                  <h2 className="text-lg font-semibold">{promo.title}</h2>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="flex-1 text-sm text-muted-foreground">{promo.description}</p>
                  <Button asChild className="mt-5 w-fit">
                    <Link href="/book">Claim this offer</Link>
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
