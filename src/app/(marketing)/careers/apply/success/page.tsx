import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/shared/page-hero";
import { Section } from "@/components/shared/section";

export const metadata = {
  title: "Application submitted",
};

export default function ApplySuccessPage() {
  return (
    <>
      <PageHero
        title="Application received"
        description="Thank you for applying. We sent a confirmation to your email and our team will review your application soon."
        actions={
          <Button asChild variant="outline">
            <Link href="/careers">Back to careers</Link>
          </Button>
        }
      />
      <Section />
    </>
  );
}
