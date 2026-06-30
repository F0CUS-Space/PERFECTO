import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Section } from "@/components/shared/section";
import { PageHero } from "@/components/shared/page-hero";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/content/faq";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about Perfecto's cleaning services, booking, deposits, and guarantees.",
};

export default function FaqPage() {
  return (
    <>
      <PageHero
        title="Frequently asked questions"
        description="Everything you need to know about booking, pricing, and our guarantees."
      />

      <Section>
        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible className="flex flex-col gap-4">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 rounded-2xl border border-border bg-secondary/40 p-8 text-center">
            <h2 className="text-xl font-semibold text-brand-navy">Still have questions?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Our team is happy to help. Reach out and we&apos;ll get back to you quickly.
            </p>
            <Button asChild className="mt-5">
              <Link href="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
