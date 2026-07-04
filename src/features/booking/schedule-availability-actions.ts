"use server";

import { getUpcomingScheduleBlocks } from "@/features/booking/services/schedule-availability";

/** Public schedule blocks for booking/reschedule UI validation. */
export async function fetchUpcomingScheduleBlocks() {
  return getUpcomingScheduleBlocks();
}
