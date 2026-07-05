import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Leaf, Star, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/shared/section";
import { ServiceCard } from "@/components/shared/service-card";
import { PageHero } from "@/components/shared/page-hero";
import { Reveal } from "@/components/shared/reveal";
import { resolveServiceImageUrl } from "@/features/services-catalog/display";
import { getActiveServices } from "@/features/services-catalog/queries";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Explore Perfecto's premium residential and commercial cleaning services — residential, deep, move in/out, office, and recurring cleaning.",
};

// Render at request time so Docker builds succeed without a database and
// admin-managed catalog changes appear immediately.
export const revalidate = 60;

export default async function ServicesPage() {
  const services = await getActiveServices();
  const servicesWithImages = await Promise.all(
    services.map(async (service) => ({
      service,
      imageSrc: await resolveServiceImageUrl(service.imageUrl, service.slug),
    })),
  );

  return (
    <>
      <PageHero
        eyebrow={
          <>
            <Sparkles className="h-3.5 w-3.5" /> Expert Home Care
          </>
        }
        title="Elevated standards for every space"
        description="Experience the luxury of a pristine home with our specialized cleaning services, tailored to your lifestyle and delivered with meticulous care."
      />

      <Section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {servicesWithImages.map(({ service, imageSrc }, i) => (
            <Reveal key={service.id} delay={(i % 3) * 80}>
              <ServiceCard service={service} imageSrc={imageSrc} />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section muted>
        <Reveal>
          <SectionHeading eyebrow="Why Perfecto" title="The Perfecto difference" />
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Fully Insured", body: "Comprehensive bonding and insurance coverage.", tone: "blue" },
            { icon: Leaf, title: "Eco-Friendly", body: "Premium, non-toxic products safe for pets and family.", tone: "green" },
            { icon: Star, title: "Vetted Pros", body: "Rigorous background checks and ongoing training.", tone: "blue" },
          ].map(({ icon: Icon, title, body, tone }, i) => (
            <Reveal key={title} delay={i * 90}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-soft">
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-white ${
                    tone === "green"
                      ? "bg-gradient-to-br from-brand-green to-brand-mint"
                      : "bg-gradient-to-br from-brand-blue to-brand-navy"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-brand-navy">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg">
            <Link href="/book">Book Now</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
