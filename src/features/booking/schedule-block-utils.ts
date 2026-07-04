/** Client-safe helpers for schedule block checks (no Prisma). */

export type ScheduleBlockSnapshot = {
  date: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
};

export function timeToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatMinutesAsTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function isArrivalBlocked(
  arrivalWindow: string,
  blocks: ScheduleBlockSnapshot[],
): boolean {
  return getScheduleBlockMessage(arrivalWindow, blocks) !== null;
}

export function getScheduleBlockMessage(
  arrivalWindow: string,
  blocks: ScheduleBlockSnapshot[],
): string | null {
  if (blocks.length === 0) return null;

  const allDay = blocks.find((block) => block.allDay);
  if (allDay) {
    return allDay.reason
      ? `This date is unavailable: ${allDay.reason}`
      : "This date is unavailable for new bookings.";
  }

  const arrivalMinutes = timeToMinutes(arrivalWindow);
  for (const block of blocks) {
    if (!block.startTime || !block.endTime) continue;
    const start = timeToMinutes(block.startTime);
    const end = timeToMinutes(block.endTime);
    if (arrivalMinutes >= start && arrivalMinutes < end) {
      const windowLabel = `${formatMinutesAsTime(start)} – ${formatMinutesAsTime(end)}`;
      return block.reason
        ? `Arrival times between ${windowLabel} are unavailable: ${block.reason}`
        : `Arrival times between ${windowLabel} are unavailable on this date.`;
    }
  }

  return null;
}

export function blocksForDate(
  blocks: ScheduleBlockSnapshot[],
  dateStr: string,
): ScheduleBlockSnapshot[] {
  return blocks.filter((block) => block.date === dateStr);
}
