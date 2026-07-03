"use client";

import { Loader2 } from "lucide-react";

import { LIST_LOAD_MORE, LIST_PAGE_SIZE } from "@/config/list-display";
import { ViewMoreButton, useViewMore } from "@/components/shared/view-more";
import { useCustomerBookings } from "@/features/dashboard/hooks/use-customer-bookings";

import { BookingCard } from "./booking-card";

export function BookingsListClient({ filter }: { filter?: "upcoming" | "past" | "all" }) {
  const { data: bookings, isLoading, error } = useCustomerBookings();

  const filtered =
    filter === "upcoming"
      ? bookings?.filter((b) => b.isUpcoming) ?? []
      : filter === "past"
        ? bookings?.filter((b) => !b.isUpcoming) ?? []
        : bookings ?? [];

  const {
    visibleItems,
    hasMore,
    remaining,
    total,
    visibleCount,
    showMore,
    loadIncrement,
  } = useViewMore(filtered, LIST_PAGE_SIZE.STACK, LIST_LOAD_MORE.STACK);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading bookings…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Unable to load bookings. Please refresh the page.
      </p>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="rounded-xl bg-secondary/60 px-4 py-8 text-center text-sm text-muted-foreground">
        {filter === "upcoming"
          ? "No upcoming bookings yet."
          : filter === "past"
            ? "No past bookings yet."
            : "No bookings yet. Book a clean to get started."}
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {visibleItems.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
      <ViewMoreButton
        hasMore={hasMore}
        remaining={remaining}
        total={total}
        visibleCount={visibleCount}
        onShowMore={showMore}
        itemLabel="bookings"
        loadIncrement={loadIncrement}
      />
    </div>
  );
}
