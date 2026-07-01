import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Section } from "@/components/shared/section";
import { BookingWizard } from "@/features/booking/components/booking-wizard";

export const metadata: Metadata = {
  title: "Book a Service",
  description: "Book your premium cleaning service online in minutes.",
};

export const dynamic = "force-dynamic";

export default function BookPage() {
  return (
    <>
      <PageHero
        title="Book your clean"
        description="Complete the steps below to schedule your service. Your quote carries forward automatically."
        containerClassName="py-12 md:py-20"
      />
      <Section className="[&>div]:py-10 md:[&>div]:py-16">
        <BookingWizard />
      </Section>
    </>
  );
}
