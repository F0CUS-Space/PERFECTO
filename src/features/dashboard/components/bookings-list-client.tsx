"use client";

import { Loader2 } from "lucide-react";

import { useCustomerBookings } from "@/features/dashboard/hooks/use-customer-bookings";

import { BookingCard } from "./booking-card";

export function BookingsListClient({ filter }: { filter?: "upcoming" | "past" | "all" }) {
  const { data: bookings, isLoading, error } = useCustomerBookings();

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

  const filtered =
    filter === "upcoming"
      ? bookings?.filter((b) => b.isUpcoming) ?? []
      : filter === "past"
        ? bookings?.filter((b) => !b.isUpcoming) ?? []
        : bookings ?? [];

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
      {filtered.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </div>
  );
}
