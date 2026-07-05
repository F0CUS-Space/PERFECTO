import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Star,
  Leaf,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { HeroBrand } from "@/components/shared/hero-brand";
import { RevealLazy as Reveal, TiltLazy as Tilt } from "@/components/shared/lazy-motion";
import { Section, SectionHeading } from "@/components/shared/section";
import { ServiceCard } from "@/components/shared/service-card";
import { TestimonialCard } from "@/components/shared/testimonial-card";
import { PageHero } from "@/components/shared/page-hero";
import { HomeAboutSection } from "@/components/marketing/home-about-section";
import { getHomeFeaturedServices } from "@/features/services-catalog/queries";
import { getFeaturedTestimonials } from "@/features/reviews/queries";
import { testimonials as fallbackTestimonials } from "@/content/testimonials";

// Home service cards are loaded from the database at runtime.
export const revalidate = 60;

const steps = [
  { icon: ClipboardList, title: "Choose your service", body: "Tell us about your space for an instant, transparent price." },
  { icon: CalendarCheck, title: "Book a time", body: "Pick a date and preferred arrival time." },
  { icon: CreditCard, title: "Pay in full", body: "Secure your booking with a simple, safe checkout." },
  { icon: Sparkles, title: "Relax", body: "Our vetted pros arrive and deliver perfect results." },
];

const valueProps = [
  { icon: ShieldCheck, title: "Fully Insured", body: "Comprehensive bonding and insurance coverage for total peace of mind.", tone: "blue" as const },
  { icon: Leaf, title: "Eco-Friendly", body: "Premium, non-toxic products that are safe for pets and the environment.", tone: "green" as const },
  { icon: Star, title: "Vetted Pros", body: "Every cleaner undergoes a rigorous background check and quality training.", tone: "blue" as const },
];

export default async function HomePage() {
  const services = await getHomeFeaturedServices(3);
  const featured = await getFeaturedTestimonials();
  const testimonials = featured.length > 0 ? featured : fallbackTestimonials;

  return (
    <>
      <PageHero
        align="left"
        brand={<HeroBrand />}
        eyebrow={
          <>
            <Sparkles className="h-3.5 w-3.5" /> Premium Home & Office Care
          </>
        }
        description="Premium residential and commercial cleaning for homes and offices — tailored to your lifestyle and delivered with meticulous care. See your price and book in minutes."
        actions={
          <>
            <Button asChild size="lg">
              <Link href="/book">
                Book Now <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/services">Explore Services</Link>
            </Button>
          </>
        }
        media={
          <Tilt className="relative" max={6}>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.75rem] border border-white/60 shadow-soft">
              <Image
                src="/images/hero-living-room.png"
                alt="A bright, immaculately cleaned modern living room"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            {/* Floating accent card for a premium, layered feel */}
            <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-2xl border border-border bg-white/90 p-3 pr-5 shadow-soft backdrop-blur sm:flex animate-float">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue to-brand-green text-white">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-brand-navy">100% Satisfaction</p>
                <p className="text-xs text-muted-foreground">Guaranteed re-clean</p>
              </div>
            </div>
            <div className="absolute -right-4 -top-4 hidden items-center gap-2 rounded-2xl border border-border bg-white/90 px-4 py-2.5 shadow-soft backdrop-blur sm:flex animate-float-slow">
              <Star className="h-4 w-4 fill-brand-green text-brand-green" />
              <span className="text-sm font-bold text-brand-navy">5.0</span>
              <span className="text-xs text-muted-foreground">rated</span>
            </div>
          </Tilt>
        }
      >
        <div className="mt-2 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-green" /> Fully insured
          </span>
          <span className="inline-flex items-center gap-2">
            <Leaf className="h-4 w-4 text-brand-green" /> Eco-friendly products
          </span>
          <span className="inline-flex items-center gap-2">
            <Star className="h-4 w-4 text-brand-green" /> 5-star rated
          </span>
        </div>
      </PageHero>

      {/* Services */}
      <Section>
        <Reveal>
          <SectionHeading
            eyebrow="Our Services"
            title="Elevated standards for every space"
            description="A preview of our most popular services — see the full catalog for every option."
          />
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <Reveal key={service.id} delay={i * 80}>
              <ServiceCard service={service} />
            </Reveal>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Button asChild variant="outline">
            <Link href="/services">View all services</Link>
          </Button>
        </div>
      </Section>

      {/* How it works */}
      <Section muted>
        <Reveal>
          <SectionHeading eyebrow="How It Works" title="Booking a perfect clean is effortless" />
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 90}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-soft">
                <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue to-brand-green" />
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue/15 to-brand-green/15 text-brand-blue">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="absolute right-5 top-5 text-2xl font-bold text-brand-blue/15">
                  0{i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-brand-navy">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Value props */}
      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          {valueProps.map(({ icon: Icon, title, body, tone }, i) => (
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
      </Section>

      <HomeAboutSection />

      {/* Testimonials */}
      <Section muted>
        <Reveal>
          <SectionHeading eyebrow="Loved by Customers" title="What our clients say" />
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.slice(0, 3).map((t, i) => (
            <Reveal key={i} delay={i * 90}>
              <TestimonialCard
                testimonial={{
                  name: t.name,
                  location: t.location,
                  rating: t.rating,
                  quote: t.quote,
                }}
              />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* CTA band */}
      <section className="container pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-brand-navy px-8 py-16 text-center shadow-soft md:px-16">
            {/* layered brand glow */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-brand-blue/40 blur-3xl animate-blob" />
              <div className="absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-brand-green/30 blur-3xl animate-float-slow" />
              {/* shimmer sweep */}
              <div className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/5 animate-shimmer" />
            </div>
            <h2 className="relative mx-auto max-w-2xl text-balance text-3xl font-bold text-white md:text-4xl">
              Ready to experience perfection?
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-pretty text-white/70">
              Book your clean today and reclaim your time. Clean spaces, perfect results.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="accent">
                <Link href="/book">
                  Book Now <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/services">Explore Services</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
