"use client";

import type { CustomerBookingSummary } from "@/features/dashboard/types";
import { LIST_LOAD_MORE, LIST_PAGE_SIZE } from "@/config/list-display";
import { ViewMoreSection } from "@/components/shared/view-more";
import { BookingCard } from "@/features/dashboard/components/booking-card";

export function DashboardRecentBookings({
  bookings,
}: {
  bookings: CustomerBookingSummary[];
}) {
  return (
    <ViewMoreSection
      items={bookings}
      initialCount={LIST_PAGE_SIZE.PREVIEW}
      step={LIST_LOAD_MORE.PREVIEW}
      itemLabel="bookings"
    >
      {(visible) => (
        <div className="grid gap-4">
          {visible.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </ViewMoreSection>
  );
}
