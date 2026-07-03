import { legalDocuments } from "@/content/legal";

/** Key cancellation-policy points shown before reschedule or cancel. */
export function getBookingPolicyHighlights(action: "reschedule" | "cancel"): string[] {
  const doc = legalDocuments.cancellation;
  if (!doc) return [];

  if (action === "reschedule") {
    const section = doc.sections.find((s) => s.heading.startsWith("1. Rescheduling"));
    return section?.body ?? [
      "You may reschedule up to 48 hours before the scheduled start time at no charge, subject to availability.",
    ];
  }

  const cancellation = doc.sections.find((s) => s.heading.startsWith("2. Cancellations"));
  const noAccess = doc.sections.find((s) => s.heading.startsWith("3. No-Access"));

  return [
    ...(cancellation?.body ?? []),
    ...(noAccess?.body ?? []),
  ];
}

export const BOOKING_POLICY_LINKS = {
  cancellation: "/legal/cancellation",
  agreement: "/legal/agreement",
} as const;
