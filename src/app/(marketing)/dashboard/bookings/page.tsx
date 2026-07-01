import Link from "next/link";

import { Button } from "@/components/ui/button";
import { BookingsListClient } from "@/features/dashboard/components/bookings-list-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Bookings",
};

export default function DashboardBookingsPage() {
  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-navy">Bookings</h1>
          <p className="mt-2 text-muted-foreground">Upcoming and past cleaning appointments.</p>
        </div>
        <Button asChild>
          <Link href="/book">Book a clean</Link>
        </Button>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-brand-navy">Upcoming</h2>
        <BookingsListClient filter="upcoming" />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-brand-navy">Past</h2>
        <BookingsListClient filter="past" />
      </section>
    </div>
  );
}
