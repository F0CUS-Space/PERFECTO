/** Arrival windows shown during scheduling (not exact times). */
export const ARRIVAL_WINDOWS = [
  { value: "8:00 AM – 11:00 AM", label: "Morning", hint: "8:00 AM – 11:00 AM" },
  { value: "11:00 AM – 2:00 PM", label: "Midday", hint: "11:00 AM – 2:00 PM" },
  { value: "2:00 PM – 5:00 PM", label: "Afternoon", hint: "2:00 PM – 5:00 PM" },
] as const;

export const BOOKING_WIZARD_STEPS = [
  { id: "property", label: "Property" },
  { id: "schedule", label: "Schedule" },
  { id: "access", label: "Access" },
  { id: "agreement", label: "Agreement" },
  { id: "review", label: "Review" },
] as const;

export type BookingWizardStepId = (typeof BOOKING_WIZARD_STEPS)[number]["id"];

export const MAX_PROPERTY_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

/** Earliest bookable date (tomorrow, local calendar). */
export function minScheduleDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Parse YYYY-MM-DD as local noon to avoid timezone day-shift. */
export function parseScheduleDate(dateStr: string): Date {
  const [y, m, day] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, day, 12, 0, 0, 0);
}
