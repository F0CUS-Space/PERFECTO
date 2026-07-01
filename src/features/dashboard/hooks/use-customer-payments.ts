"use client";

import { useQuery } from "@tanstack/react-query";

import type { CustomerPaymentRow } from "@/features/dashboard/types";

async function fetchPayments(): Promise<CustomerPaymentRow[]> {
  const res = await fetch("/api/dashboard/payments");
  if (!res.ok) throw new Error("Failed to load payments");
  const data = await res.json();
  return data.payments;
}

export function useCustomerPayments() {
  return useQuery({
    queryKey: ["dashboard", "payments"],
    queryFn: fetchPayments,
  });
}
