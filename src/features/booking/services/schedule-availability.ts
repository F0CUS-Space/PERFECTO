import "server-only";

import { parseScheduleDate } from "@/config/booking";
import {
  blocksForDate,
  getScheduleBlockMessage,
  type ScheduleBlockSnapshot,
} from "@/features/booking/schedule-block-utils";
import { prisma } from "@/lib/prisma";

export function toScheduleDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function serializeBlock(block: {
  blockDate: Date;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}): ScheduleBlockSnapshot {
  return {
    date: toScheduleDateString(block.blockDate),
    allDay: block.allDay,
    startTime: block.startTime,
    endTime: block.endTime,
    reason: block.reason,
  };
}

export async function getUpcomingScheduleBlocks(): Promise<ScheduleBlockSnapshot[]> {
  const today = parseScheduleDate(toScheduleDateString(new Date()));
  const rows = await prisma.scheduleBlock.findMany({
    where: { blockDate: { gte: today } },
    orderBy: [{ blockDate: "asc" }, { allDay: "desc" }, { startTime: "asc" }],
  });
  return rows.map(serializeBlock);
}

export async function getScheduleAvailabilityError(
  scheduledDate: string,
  arrivalWindow: string,
): Promise<string | null> {
  const blockDate = parseScheduleDate(scheduledDate);
  const rows = await prisma.scheduleBlock.findMany({
    where: { blockDate },
    orderBy: [{ allDay: "desc" }, { startTime: "asc" }],
  });
  return getScheduleBlockMessage(arrivalWindow, rows.map(serializeBlock));
}

export async function listAdminScheduleBlocks() {
  const today = parseScheduleDate(toScheduleDateString(new Date()));
  return prisma.scheduleBlock.findMany({
    where: { blockDate: { gte: today } },
    include: {
      createdBy: { select: { firstName: true, lastName: true, phone: true } },
    },
    orderBy: [{ blockDate: "asc" }, { allDay: "desc" }, { startTime: "asc" }],
  });
}

export { blocksForDate };
