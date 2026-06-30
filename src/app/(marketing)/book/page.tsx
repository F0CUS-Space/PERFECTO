import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

// Placeholder for Milestone 4 (Online Booking System).
export const metadata: Metadata = {
  title: "Book a Service",
  description: "Book your premium cleaning service online in minutes.",
};

export default function BookPage() {
  return (
    <ComingSoon
      title="Online booking — coming soon"
      description="Our seamless online booking experience is almost ready. For now, contact us to schedule your service and we'll take care of the rest."
    />
  );
}
