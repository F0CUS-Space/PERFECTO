import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/shared/section";
import { PageHero } from "@/components/shared/page-hero";
import { Tilt } from "@/components/shared/tilt";
import { Reveal } from "@/components/shared/reveal";
import { getServiceBySlug, getServiceSlugs } from "@/features/services-catalog/queries";
import { serviceDetails, defaultServiceDetail } from "@/content/services-detail";

// Runtime SSR — catalog comes from PostgreSQL; no DB required at image build time.
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const slugs = await getServiceSlugs();
  return slugs.map((slug) => ({ slug }));
}

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

  const detail = serviceDetails[service.slug] ?? defaultServiceDetail;

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
          <>
            <Button asChild size="lg">
              <Link href="/book">
                Book Now <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/book">Book Now</Link>
            </Button>
          </>
        }
        media={
          <Tilt className="relative">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-white/60 shadow-soft">
              <Image
                src={detail.image}
                alt={service.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
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
            <ul className="mt-6 space-y-3">
              {detail.includes.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-brand-green">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm text-foreground/80">{item}</span>
                </li>
              ))}
            </ul>
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

            <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="text-lg font-semibold text-brand-navy">Transparent pricing</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your final price depends on your space and selected add-ons. Use our instant quote
                calculator to see an estimate in seconds — no surprises.
              </p>
              <Button asChild className="mt-5">
                <Link href="/book">Calculate my price</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
