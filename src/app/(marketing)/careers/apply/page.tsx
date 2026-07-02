import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/shared/page-hero";
import { Section } from "@/components/shared/section";
import { JobApplicationForm } from "@/features/recruitment/components/job-application-form";
import { resolveJobPosition } from "@/features/recruitment/positions";
import { getActiveJobPostings } from "@/features/recruitment/queries";
import { isS3Configured } from "@/lib/s3-ready";

export const metadata: Metadata = {
  title: "Apply",
  description: "Apply to join the Perfecto cleaning team.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ position?: string }>;
}

export default async function ApplyPage({ searchParams }: PageProps) {
  const { position } = await searchParams;
  const jobs = await getActiveJobPostings();
  const positions = jobs.map((job) => job.title);

  if (positions.length === 0) {
    return (
      <>
        <PageHero
          title="Apply to Perfecto"
          description="There are no open positions right now. Please check back later."
          containerClassName="py-12 md:py-16"
        />
        <Section className="text-center">
          <Button asChild variant="outline">
            <Link href="/careers">Back to careers</Link>
          </Button>
        </Section>
      </>
    );
  }

  const defaultPosition = resolveJobPosition(position, jobs);

  return (
    <>
      <PageHero
        title="Apply to Perfecto"
        description="Tell us about yourself and attach your resume — we'll be in touch soon."
        containerClassName="py-12 md:py-16"
      />
      <Section className="[&>div]:py-10 md:[&>div]:py-14">
        <JobApplicationForm
          defaultPosition={defaultPosition}
          positions={positions}
          uploadsEnabled={isS3Configured()}
        />
      </Section>
    </>
  );
}
