import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Section } from "@/components/shared/section";
import { BookFlow } from "@/features/booking/components/book-flow";
import { getQuoteCatalog } from "@/features/quote/queries";

export const metadata: Metadata = {
  title: "Book Now",
  description: "Choose your service, see your price, and schedule your premium clean in one simple flow.",
};

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const catalog = await getQuoteCatalog();

  return (
    <>
      <PageHero
        title="Book your clean"
        description="Choose your service, customize your clean, and schedule your visit — all in one place."
        containerClassName="py-12 md:py-20"
      />
      <Section className="[&>div]:py-10 md:[&>div]:py-16">
        <BookFlow catalog={catalog} />
      </Section>
    </>
  );
}
