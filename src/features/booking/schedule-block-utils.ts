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

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isDateFullyBlocked(
  dateStr: string,
  blocks: ScheduleBlockSnapshot[],
): boolean {
  return blocksForDate(blocks, dateStr).some((block) => block.allDay);
}

export function getFullyBlockedReason(
  dateStr: string,
  blocks: ScheduleBlockSnapshot[],
): string | null {
  const block = blocksForDate(blocks, dateStr).find((entry) => entry.allDay);
  return block?.reason ?? (block ? "Unavailable" : null);
}

export function listAvailableArrivalTimes(
  dateStr: string,
  blocks: ScheduleBlockSnapshot[],
  options: {
    startTime?: string;
    endTime?: string;
    intervalMinutes?: number;
  } = {},
): string[] {
  const dayBlocks = blocksForDate(blocks, dateStr);
  if (dayBlocks.some((block) => block.allDay)) return [];

  const startTime = options.startTime ?? "07:00";
  const endTime = options.endTime ?? "18:00";
  const intervalMinutes = options.intervalMinutes ?? 30;
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const slots: string[] = [];

  for (let minutes = startMin; minutes < endMin; minutes += intervalMinutes) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mins = String(minutes % 60).padStart(2, "0");
    const slot = `${hours}:${mins}`;
    if (!isArrivalBlocked(slot, dayBlocks)) {
      slots.push(slot);
    }
  }

  return slots;
}

export function firstSelectableDate(
  minDateStr: string,
  horizonDays: number,
  blocks: ScheduleBlockSnapshot[],
): string | null {
  const start = parseDateString(minDateStr);
  for (let offset = 0; offset < horizonDays; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const dateStr = toDateString(date);
    if (!isDateFullyBlocked(dateStr, blocks)) {
      return dateStr;
    }
  }
  return null;
}

export function maxSelectableDate(minDateStr: string, horizonDays: number): string {
  const start = parseDateString(minDateStr);
  const end = new Date(start);
  end.setDate(start.getDate() + horizonDays - 1);
  return toDateString(end);
}

export function isDateSelectable(
  dateStr: string,
  minDateStr: string,
  maxDateStr: string,
  blocks: ScheduleBlockSnapshot[],
): boolean {
  if (dateStr < minDateStr || dateStr > maxDateStr) return false;
  return !isDateFullyBlocked(dateStr, blocks);
}
