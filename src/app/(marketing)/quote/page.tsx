import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

// Placeholder for Milestone 3 (Instant Quote Calculator).
export const metadata: Metadata = {
  title: "Instant Quote",
  description: "Get an instant, transparent estimate for your cleaning service.",
};

export default function QuotePage() {
  return (
    <ComingSoon
      title="Instant Quote — coming soon"
      description="Our instant quote calculator is on its way. In the meantime, explore our services or reach out and we'll prepare a tailored estimate for you."
    />
  );
}
