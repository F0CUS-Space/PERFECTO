import type { BookingStatus } from "@prisma/client";

const TERMINAL_STATUSES: BookingStatus[] = ["COMPLETED", "CANCELLED"];

export function isServiceDayPassed(scheduledDate: Date | string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduled = new Date(scheduledDate);
  scheduled.setHours(0, 0, 0, 0);
  return scheduled < today;
}

/** Hours until the scheduled arrival time (negative if already started/passed). */
export function hoursUntilServiceStart(scheduledDate: Date | string, arrivalWindow: string): number {
  const start = new Date(scheduledDate);
  const match = arrivalWindow.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    start.setHours(Number(match[1]), Number(match[2]), 0, 0);
  } else {
    start.setHours(9, 0, 0, 0);
  }
  return (start.getTime() - Date.now()) / (1000 * 60 * 60);
}

export function isWithinLateChangeWindow(
  scheduledDate: Date | string,
  arrivalWindow: string,
): boolean {
  return hoursUntilServiceStart(scheduledDate, arrivalWindow) < 48;
}

export function canCustomerCancelBooking(input: {
  status: BookingStatus;
  scheduledDate: Date | string;
}): boolean {
  if (TERMINAL_STATUSES.includes(input.status)) return false;
  if (isServiceDayPassed(input.scheduledDate)) return false;
  return true;
}

export function canCustomerRescheduleBooking(input: {
  status: BookingStatus;
  scheduledDate: Date | string;
}): boolean {
  if (TERMINAL_STATUSES.includes(input.status)) return false;
  if (isServiceDayPassed(input.scheduledDate)) return false;
  return true;
}

export function canCustomerReviewBooking(input: {
  status: BookingStatus;
  scheduledDate: Date | string;
  depositSatisfied: boolean;
  hasReview: boolean;
}): boolean {
  if (input.hasReview) return false;
  if (input.status === "CANCELLED") return false;
  if (!input.depositSatisfied) return false;
  if (!isServiceDayPassed(input.scheduledDate)) return false;
  return true;
}
