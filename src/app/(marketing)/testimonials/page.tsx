import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Section } from "@/components/shared/section";
import { PageHero } from "@/components/shared/page-hero";
import { Reveal } from "@/components/shared/reveal";
import { TestimonialCard } from "@/components/shared/testimonial-card";
import { StarRating } from "@/components/shared/star-rating";
import { testimonials } from "@/content/testimonials";

export const metadata: Metadata = {
  title: "Testimonials",
  description: "Read why households and businesses trust Perfecto Cleaning Services for spotless, reliable results.",
};

export default function TestimonialsPage() {
  return (
    <>
      <PageHero
        eyebrow={<StarRating rating={5} />}
        title="Trusted by customers like you"
        description="Don't just take our word for it — here's what our clients have to say about the Perfecto experience."
      />

      <Section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={(i % 3) * 80}>
              <TestimonialCard testimonial={t} />
            </Reveal>
          ))}
        </div>
        <div className="mt-12 flex justify-center">
          <Button asChild size="lg">
            <Link href="/book">Book now</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
