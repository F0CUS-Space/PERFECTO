import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/shared/page-hero";
import { Section } from "@/components/shared/section";
import { Button } from "@/components/ui/button";
import { OfferPayWizard } from "@/features/estimates/components/offer-pay-wizard";
import { getPublicOfferByToken } from "@/features/estimates/queries";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const offer = await getPublicOfferByToken(token);
  if (!offer) {
    return { title: "Estimate not found" };
  }
  return {
    title: `Pay estimate — ${offer.serviceName}`,
    description: `Complete your ${offer.serviceName} estimate for ${formatCurrency(offer.totalAmount)}.`,
  };
}

export default async function BookOfferPage({ params }: PageProps) {
  const { token } = await params;
  const offer = await getPublicOfferByToken(token);

  if (!offer) {
    return (
      <>
        <PageHero
          title="Estimate not found"
          description="This pay link is invalid or no longer available."
        />
        <Section>
          <Button asChild>
            <Link href="/contact?intent=estimate">Request a new estimate</Link>
          </Button>
        </Section>
      </>
    );
  }

  if (offer.status === "CANCELLED") {
    return (
      <>
        <PageHero
          title="Estimate cancelled"
          description="This estimate was cancelled. Contact us if you still need a clean."
        />
        <Section>
          <Button asChild>
            <Link href="/contact?intent=estimate">Contact us</Link>
          </Button>
        </Section>
      </>
    );
  }

  if (offer.status === "CONVERTED") {
    return (
      <>
        <PageHero
          title="Estimate already used"
          description="This estimate has already been converted into a booking."
        />
        <Section>
          <Button asChild>
            <Link href="/dashboard/bookings">View your bookings</Link>
          </Button>
        </Section>
      </>
    );
  }

  if (offer.status === "DRAFT") {
    return (
      <>
        <PageHero
          title="Estimate not ready"
          description="This estimate has not been sent yet. Please wait for your Perfecto team to email you."
        />
        <Section>
          <Button asChild>
            <Link href="/contact">Contact us</Link>
          </Button>
        </Section>
      </>
    );
  }

  if (offer.isExpired || offer.status === "EXPIRED") {
    return (
      <>
        <PageHero
          title="Estimate expired"
          description="This estimate has expired. Reach out and we'll prepare a fresh one."
        />
        <Section>
          <Button asChild>
            <Link href="/contact?intent=estimate">Request a new estimate</Link>
          </Button>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHero
        title="Complete your booking"
        description={`Hi ${offer.customerName} — pick a time, confirm your address, and pay securely.`}
        containerClassName="py-12 md:py-16"
      />
      <Section className="[&>div]:py-10 md:[&>div]:py-14">
        <OfferPayWizard offer={offer} />
      </Section>
    </>
  );
}
