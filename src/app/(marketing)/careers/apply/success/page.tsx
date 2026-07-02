import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/shared/page-hero";
import { Section } from "@/components/shared/section";

export const metadata = {
  title: "Application submitted",
};

interface PageProps {
  searchParams: Promise<{ id?: string; email?: string }>;
}

export default async function ApplySuccessPage({ searchParams }: PageProps) {
  const { id, email } = await searchParams;
  const confirmationSent = email !== "skipped";

  const description = confirmationSent
    ? "Thank you for applying. We sent a confirmation to your email and our team will review your application soon."
    : "Thank you for applying. Our team will review your application and get back to you soon.";

  return (
    <>
      <PageHero
        title="Application received"
        description={description}
        actions={
          <Button asChild variant="outline">
            <Link href="/careers">Back to careers</Link>
          </Button>
        }
      />
      <Section>
        {id && (
          <p className="mx-auto max-w-xl text-center text-sm text-muted-foreground">
            Reference: <span className="font-mono text-brand-navy">{id}</span>
          </p>
        )}
      </Section>
    </>
  );
}
