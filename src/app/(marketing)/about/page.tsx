import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShieldCheck, Sparkles, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/shared/section";
import { PageHero } from "@/components/shared/page-hero";
import { Reveal } from "@/components/shared/reveal";
import { Tilt } from "@/components/shared/tilt";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Perfecto Cleaning Services is built on trust, craftsmanship, and care. Learn about our mission to deliver clean spaces and perfect results.",
};

const values = [
  { icon: Sparkles, title: "Craftsmanship", body: "We treat every space as if it were our own, obsessing over the details others overlook." },
  { icon: ShieldCheck, title: "Trust", body: "Vetted, insured professionals and transparent pricing — no surprises, ever." },
  { icon: Heart, title: "Care", body: "Eco-friendly products and genuine respect for your home, family, and time." },
  { icon: Users, title: "Community", body: "We invest in our people with fair pay, training, and a supportive culture." },
];

const stats = [
  { value: "5★", label: "Average rating" },
  { value: "100%", label: "Satisfaction guarantee" },
  { value: "Insured", label: "& fully bonded" },
  { value: "Eco", label: "Friendly products" },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <Sparkles className="h-3.5 w-3.5" /> Our Story
          </>
        }
        title="We're redefining what a cleaning service can be"
        description="Perfecto was founded on a simple belief: a clean home is a foundation for a better life. We combine meticulous craftsmanship with modern convenience to give you back your time — and your peace of mind."
      />

      <Section>
        <div className="grid items-center gap-12 md:grid-cols-2">
          <Reveal>
            <Tilt max={6}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/60 shadow-soft">
                <Image
                  src="/images/hero-living-room.png"
                  alt="A beautifully clean, premium living space"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-blue/15 to-brand-green/15 mix-blend-multiply" />
              </div>
            </Tilt>
          </Reveal>
          <div>
            <SectionHeading
              align="left"
              eyebrow="Our Story"
              title="Built on trust, delivered with care"
            />
            <div className="mt-6 space-y-4 text-muted-foreground">
              <p>
                What began as a commitment to do cleaning the right way has grown into a premium
                service trusted by households and businesses alike. Every booking is backed by
                vetted professionals, premium eco-friendly products, and a 100% satisfaction
                guarantee.
              </p>
              <p>
                We built our platform to make excellence effortless: get an instant quote, book in
                minutes, pay a simple deposit, and relax while we deliver perfect results.
              </p>
            </div>
            <Button asChild className="mt-8">
              <Link href="/quote">Get an Instant Quote</Link>
            </Button>
          </div>
        </div>
      </Section>

      <Section muted>
        <Reveal>
          <SectionHeading eyebrow="Our Values" title="What we stand for" />
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-soft">
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-white ${
                    i % 2 === 0
                      ? "bg-gradient-to-br from-brand-blue to-brand-navy"
                      : "bg-gradient-to-br from-brand-green to-brand-mint"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-brand-navy">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <Reveal>
          <div className="grid gap-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand-navy to-brand-blue p-8 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="mt-1 text-sm text-white/70">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>
    </>
  );
}
