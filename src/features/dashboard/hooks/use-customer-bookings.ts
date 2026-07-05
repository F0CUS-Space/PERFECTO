"use client";

import { useQuery } from "@tanstack/react-query";

import type { CustomerBookingSummary } from "@/features/dashboard/types";

async function fetchBookings(): Promise<CustomerBookingSummary[]> {
  const res = await fetch("/api/dashboard/bookings?limit=100");
  if (!res.ok) throw new Error("Failed to load bookings");
  const data = await res.json();
  return data.bookings;
}

export function useCustomerBookings() {
  return useQuery({
    queryKey: ["dashboard", "bookings"],
    queryFn: fetchBookings,
  });
}
