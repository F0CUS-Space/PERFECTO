import type { Metadata } from "next";
import Link from "next/link";
import { Check, Briefcase, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/shared/section";
import { PageHero } from "@/components/shared/page-hero";
import { careerPerks } from "@/content/careers";
import { JobMetaChips } from "@/features/recruitment/components/job-meta-chips";
import { getActiveJobPostings } from "@/features/recruitment/queries";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join the Perfecto team. Hiring cleaners in NOVA, Washington DC, and Maryland — up to $30/hr, flexible schedules, training provided.",
};

export const dynamic = "force-dynamic";

export default async function CareersPage() {
  const jobOpenings = await getActiveJobPostings();

  return (
    <>
      <PageHero
        align="left"
        containerClassName="py-12 md:py-16 lg:py-20 lg:items-start"
        eyebrow={
          <>
            <Briefcase className="h-3.5 w-3.5" /> We&apos;re Hiring
          </>
        }
        title="Build your career with Perfecto"
        description="We're hiring cleaners across NOVA, Washington DC, and Maryland — up to $30/hr, flexible schedules, and a supportive team that invests in your growth. Training provided."
        actions={
          jobOpenings.length > 0 ? (
            <Button asChild size="lg">
              <Link href="/careers/apply">
                Apply now <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : undefined
        }
        media={
          <aside
            id="openings"
            className="scroll-mt-24 rounded-2xl border border-border/80 bg-white/80 p-5 shadow-soft backdrop-blur sm:p-6"
            aria-labelledby="openings-heading"
          >
            <div className="mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-green">
                Open Roles
              </span>
              <h2
                id="openings-heading"
                className="mt-1 text-balance text-2xl font-bold tracking-tight text-brand-navy"
              >
                Current openings
              </h2>
            </div>

            {jobOpenings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open roles at the moment. Check back soon or contact us to express interest.
              </p>
            ) : (
              <ul className="flex max-h-[min(28rem,55vh)] flex-col gap-3 overflow-y-auto pr-1">
                {jobOpenings.map((job) => (
                  <li
                    key={job.id}
                    className="rounded-xl border border-border bg-card p-4 shadow-card"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-brand-navy">{job.title}</h3>
                        <JobMetaChips
                          className="mt-2"
                          type={job.type}
                          location={job.location}
                          compensation={job.compensation}
                        />
                        <p className="mt-2 text-sm text-muted-foreground">{job.summary}</p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="shrink-0">
                        <Link href={`/careers/apply?position=${encodeURIComponent(job.title)}`}>
                          Apply <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
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
    </>
  );
}
