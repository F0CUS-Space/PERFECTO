import type { Metadata } from "next";

import { Section, SectionHeading } from "@/components/shared/section";
import { PageHero } from "@/components/shared/page-hero";
import { Reveal } from "@/components/shared/reveal";
import { TestimonialCard } from "@/components/shared/testimonial-card";
import { testimonials as fallbackTestimonials } from "@/content/testimonials";
import { getFeaturedTestimonials } from "@/features/reviews/queries";

export const metadata: Metadata = {
  title: "Testimonials",
  description: "Hear from Perfecto customers about their experience with our cleaning professionals.",
};

export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  const dbTestimonials = await getFeaturedTestimonials();
  const testimonials = dbTestimonials.length > 0 ? dbTestimonials : fallbackTestimonials;

  return (
    <>
      <PageHero
        title="What our customers say"
        description="Real feedback from homeowners and businesses who trust Perfecto."
      />
      <Section>
        <Reveal>
          <SectionHeading title="Customer stories" />
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={i} delay={i * 60}>
              <TestimonialCard testimonial={{ name: t.name, location: t.location, rating: t.rating, quote: t.quote }} />
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
