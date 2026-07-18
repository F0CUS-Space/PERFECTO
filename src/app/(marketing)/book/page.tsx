import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";

import { PageHero } from "@/components/shared/page-hero";
import { Section } from "@/components/shared/section";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Get an estimate",
  description:
    "Contact Perfecto for a personalized facility cleaning estimate. We'll follow up with a quote and a secure pay link.",
};

export default function BookPage() {
  return (
    <>
      <PageHero
        title="Get your estimate"
        description="Tell us about your facility and we'll prepare a personalized quote. Once you're ready, you'll receive a secure link to pick a time and pay."
        containerClassName="py-12 md:py-20"
      />
      <Section className="[&>div]:py-10 md:[&>div]:py-16">
        <div className="mx-auto max-w-2xl space-y-8 text-center">
          <p className="text-muted-foreground">
            Online self-serve booking has moved to staff-prepared estimates so every job is scoped
            and priced accurately for your facility.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/contact?intent=estimate">Request an estimate</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={`tel:${siteConfig.contact.phoneE164}`}>
                <Phone className="mr-2 h-4 w-4" />
                Call {siteConfig.contact.phone}
              </a>
            </Button>
          </div>
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <a href={`mailto:${siteConfig.contact.email}`} className="hover:text-brand-blue">
              {siteConfig.contact.email}
            </a>
          </p>
          <p className="text-xs text-muted-foreground">
            Already received a pay link? Open it from your estimate email to schedule and pay.
          </p>
        </div>
      </Section>
    </>
  );
}
