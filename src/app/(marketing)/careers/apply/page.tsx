import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Section } from "@/components/shared/section";
import { JobApplicationForm } from "@/features/recruitment/components/job-application-form";
import { resolveJobPosition } from "@/features/recruitment/positions";
import { isS3Configured } from "@/lib/s3-ready";

export const metadata: Metadata = {
  title: "Apply",
  description: "Apply to join the Perfecto cleaning team.",
};

interface PageProps {
  searchParams: Promise<{ position?: string }>;
}

export default async function ApplyPage({ searchParams }: PageProps) {
  const { position } = await searchParams;

  return (
    <>
      <PageHero
        title="Apply to Perfecto"
        description="Tell us about yourself and attach your resume — we'll be in touch soon."
        containerClassName="py-12 md:py-16"
      />
      <Section className="[&>div]:py-10 md:[&>div]:py-14">
        <JobApplicationForm
          defaultPosition={resolveJobPosition(position)}
          uploadsEnabled={isS3Configured()}
        />
      </Section>
    </>
  );
}
