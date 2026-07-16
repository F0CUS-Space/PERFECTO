import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/shared/section";
import { PageHero } from "@/components/shared/page-hero";
import { Tilt } from "@/components/shared/tilt";
import { Reveal } from "@/components/shared/reveal";
import {
  getServicePageContent,
  resolveServiceImageUrl,
} from "@/features/services-catalog/display";
import { getServiceBySlug } from "@/features/services-catalog/queries";

// Request-time render (same as /services) so Docker builds don't need DB
// and admin catalog changes show up without a redeploy.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return { title: "Service Not Found" };
  return {
    title: service.name,
    description: service.description,
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const detail = getServicePageContent(service);
  let heroImage = "/brand/perfecto-icon.png";
  try {
    heroImage = await resolveServiceImageUrl(service.imageUrl, service.slug);
  } catch (error) {
    console.error("[ServiceDetailPage] image resolve failed", slug, error);
  }

  return (
    <>
      <PageHero
        align="left"
        eyebrow={
          <Link href="/services" className="hover:underline">
            ← All services
          </Link>
        }
        title={service.name}
        description={detail.longDescription}
        actions={
          <Button asChild size="lg">
            <Link href="/book">
              Book Now <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
        media={
          <Tilt className="relative">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-white/60 shadow-soft bg-secondary">
              <Image
                src={heroImage}
                alt={service.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                unoptimized={heroImage.startsWith("http")}
              />
              <div className={cn("absolute inset-0 bg-gradient-to-tr mix-blend-multiply opacity-40", detail.accent)} />
              <span className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-xs font-medium text-brand-green shadow-card">
                <Sparkles className="h-3.5 w-3.5" /> Perfecto Standard
              </span>
            </div>
          </Tilt>
        }
      >
        <div className="text-sm text-muted-foreground">
          Starting from{" "}
          <span className="text-2xl font-bold text-brand-navy">
            {formatCurrency(service.basePrice)}
          </span>
        </div>
      </PageHero>

      <Section>
        <div className="grid gap-12 md:grid-cols-2">
          <Reveal>
            <h2 className="text-2xl font-bold text-brand-navy">What&apos;s included</h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {detail.includes.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border bg-secondary px-4 py-2 text-sm font-medium text-brand-navy"
                >
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="text-2xl font-bold text-brand-navy">Ideal for</h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {detail.idealFor.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border bg-secondary px-4 py-2 text-sm font-medium text-brand-navy"
                >
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={240} className="mt-16 flex flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-10 text-center shadow-card sm:px-10">
          <h2 className="text-2xl font-bold text-brand-navy">Ready to book {service.name}?</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Starting from {formatCurrency(service.basePrice)} — get an instant quote and schedule in minutes.
          </p>
          <Button asChild size="lg">
            <Link href="/book">
              Book Now <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Reveal>
      </Section>
    </>
  );
}
