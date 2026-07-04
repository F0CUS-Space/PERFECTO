"use client";

import { AlertTriangle } from "lucide-react";

import {
  blocksForDate,
  getScheduleBlockMessage,
  type ScheduleBlockSnapshot,
} from "@/features/booking/schedule-block-utils";

export function ScheduleAvailabilityNotice({
  blocks,
  scheduledDate,
  arrivalWindow,
}: {
  blocks: ScheduleBlockSnapshot[];
  scheduledDate: string;
  arrivalWindow: string;
}) {
  if (!scheduledDate || !arrivalWindow) return null;

  const message = getScheduleBlockMessage(
    arrivalWindow,
    blocksForDate(blocks, scheduledDate),
  );

  if (!message) return null;

  return (
    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
