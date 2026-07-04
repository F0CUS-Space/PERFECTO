export const BOOKING_WIZARD_STEPS = [
  { id: "property", label: "Property" },
  { id: "schedule", label: "Schedule" },
  { id: "access", label: "Access" },
  { id: "agreement", label: "Confirm & pay" },
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

/** Default arrival time for the schedule step (24h HH:MM). */
export const DEFAULT_ARRIVAL_TIME = "09:00";

/** Bookable arrival window for the schedule picker (24h HH:MM). */
export const BOOKING_ARRIVAL_START = "07:00";
export const BOOKING_ARRIVAL_END = "18:00";
export const BOOKING_ARRIVAL_INTERVAL_MINUTES = 30;

/** How far ahead customers can book. */
export const BOOKING_SCHEDULE_HORIZON_DAYS = 90;
