import type { Metadata } from "next";
import Link from "next/link";
import { Check, MapPin, Briefcase, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/shared/section";
import { PageHero } from "@/components/shared/page-hero";
import { jobOpenings, careerPerks } from "@/content/careers";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join the Perfecto team. We're hiring vetted, detail-obsessed cleaning professionals who take pride in their work.",
};

export default function CareersPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <Briefcase className="h-3.5 w-3.5" /> We&apos;re Hiring
          </>
        }
        title="Build your career with Perfecto"
        description="We're looking for dedicated, detail-obsessed professionals who take pride in their craft. Join a supportive team that invests in your growth."
        actions={
          <Button asChild size="lg">
            <Link href="#openings">View open roles</Link>
          </Button>
        }
      />

      <Section>
        <SectionHeading eyebrow="Why Join Us" title="Perks of being a Perfecto pro" />
        <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
          {careerPerks.map((perk) => (
            <div
              key={perk}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-brand-green">
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm text-foreground/80">{perk}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section muted>
        <div id="openings" className="scroll-mt-24">
          <SectionHeading eyebrow="Open Roles" title="Current openings" />
          <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-4">
            {jobOpenings.map((job) => (
              <div
                key={job.title}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="text-lg font-semibold text-brand-navy">{job.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{job.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" /> {job.type}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> {job.location}
                    </span>
                  </div>
                </div>
                {/* Online application portal arrives in a later milestone; route to contact for now. */}
                <Button asChild variant="outline" className="shrink-0">
                  <Link href="/contact">
                    Apply <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
