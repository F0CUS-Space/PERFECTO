import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/shared/section";
import { PageHero } from "@/components/shared/page-hero";
import { Reveal } from "@/components/shared/reveal";
import { Tilt } from "@/components/shared/tilt";
import { BeforeAfter } from "@/components/shared/before-after";
import { beforeAfterPairs, galleryItems } from "@/content/gallery";

export const metadata: Metadata = {
  title: "Gallery",
  description: "See the Perfecto difference — a showcase of spaces transformed by our cleaning professionals.",
};

export default function GalleryPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <Sparkles className="h-3.5 w-3.5" /> Before &amp; After
          </>
        }
        title="Spaces we've perfected"
        description="A glimpse of the meticulous results our professionals deliver, day after day. Drag the slider to see the transformation."
      />

      {/* Before / after transformations */}
      <Section>
        <Reveal>
          <SectionHeading
            eyebrow="The Transformation"
            title="Drag to see the difference"
            description="Real results from our deep-clean specialists."
          />
        </Reveal>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {beforeAfterPairs.map((pair, i) => (
            <Reveal key={pair.title} delay={i * 100}>
              <BeforeAfter
                beforeSrc={pair.before}
                afterSrc={pair.after}
                beforeAlt={`${pair.title} before cleaning`}
                afterAlt={`${pair.title} after cleaning`}
                label={`${pair.title} · ${pair.category}`}
              />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Photo grid */}
      <Section muted>
        <Reveal>
          <SectionHeading eyebrow="Our Work" title="A showcase of perfected spaces" />
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {galleryItems.map((item, i) => (
            <Reveal key={item.title} delay={(i % 3) * 80}>
              <Tilt max={5}>
                <div className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl shadow-card">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/70 via-brand-navy/10 to-transparent" />
                  <div className="relative p-5">
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-brand-green shadow-sm">
                      <Sparkles className="h-3 w-3" /> {item.category}
                    </span>
                    <p className="mt-2 text-lg font-semibold text-white">{item.title}</p>
                  </div>
                </div>
              </Tilt>
            </Reveal>
          ))}
        </div>
        <div className="mt-12 flex justify-center">
          <Button asChild size="lg">
            <Link href="/quote">Get your space perfected</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
