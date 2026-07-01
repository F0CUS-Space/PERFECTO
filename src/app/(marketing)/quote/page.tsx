import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Section } from "@/components/shared/section";
import { QuoteCalculator } from "@/features/quote/quote-calculator";
import { getQuoteCatalog } from "@/features/quote/queries";

export const metadata: Metadata = {
  title: "Instant Quote",
  description: "Get an instant, transparent estimate for your cleaning service.",
};

export const dynamic = "force-dynamic";

export default async function QuotePage() {
  const catalog = await getQuoteCatalog();

  return (
    <>
      <PageHero
        title="Instant quote"
        description="Tell us about your home and see a transparent estimate in seconds — no surprises, no waiting for a callback."
      />
      <Section>
        <QuoteCalculator catalog={catalog} />
      </Section>
    </>
  );
}
