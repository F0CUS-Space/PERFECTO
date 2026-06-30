import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Section } from "@/components/shared/section";
import { PageHero } from "@/components/shared/page-hero";
import { legalDocuments, legalSlugs } from "@/content/legal";

export function generateStaticParams() {
  return legalSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = legalDocuments[slug];
  if (!doc) return { title: "Not Found" };
  return { title: doc.title, description: doc.summary };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = legalDocuments[slug];
  if (!doc) notFound();

  return (
    <>
      <PageHero align="left" title={doc.title} description={doc.summary} />
      <Section>
        <div className="mx-auto max-w-3xl">
          <div className="space-y-6">
          {doc.sections.map((section, idx) => (
            <div key={`${section.heading}-${idx}`} className={section.heading ? "" : "-mt-3"}>
              {section.heading ? (
                <h2 className="text-lg font-semibold text-brand-navy">{section.heading}</h2>
              ) : null}
              {section.body?.map((paragraph, i) => (
                <p key={i} className="mt-2 text-sm leading-relaxed text-foreground/80">
                  {paragraph}
                </p>
              ))}
              {section.list ? (
                <ul className="mt-3 space-y-2">
                  {section.list.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/80">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
          </div>

          <p className="mt-12 rounded-xl border border-border bg-secondary/40 p-4 text-xs text-muted-foreground">
            This document is a general template and does not constitute legal advice. Please have it
            reviewed by qualified legal counsel before relying on it.
          </p>
        </div>
      </Section>
    </>
  );
}
