"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  BOOKING_ARRIVAL_END,
  BOOKING_ARRIVAL_INTERVAL_MINUTES,
  BOOKING_ARRIVAL_START,
  BOOKING_SCHEDULE_HORIZON_DAYS,
  DEFAULT_ARRIVAL_TIME,
  minScheduleDateString,
} from "@/config/booking";
import { Label } from "@/components/ui/label";
import { displayArrivalTime } from "@/lib/format-arrival-time";
import { cn } from "@/lib/utils";

import {
  firstSelectableDate,
  getFullyBlockedReason,
  isDateSelectable,
  listAvailableArrivalTimes,
  maxSelectableDate,
  parseDateString,
  toDateString,
  type ScheduleBlockSnapshot,
} from "../schedule-block-utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type SchedulePickerProps = {
  scheduledDate: string;
  arrivalWindow: string;
  blocks: ScheduleBlockSnapshot[];
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  minDate?: string;
  idPrefix?: string;
};

function buildCalendarCells(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: startOffset }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function SchedulePicker({
  scheduledDate,
  arrivalWindow,
  blocks,
  onDateChange,
  onTimeChange,
  minDate = minScheduleDateString(),
  idPrefix = "schedule",
}: SchedulePickerProps) {
  const maxDate = useMemo(
    () => maxSelectableDate(minDate, BOOKING_SCHEDULE_HORIZON_DAYS),
    [minDate],
  );

  const initialMonth = scheduledDate ? parseDateString(scheduledDate) : parseDateString(minDate);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1),
  );

  const availableTimes = useMemo(
    () =>
      scheduledDate
        ? listAvailableArrivalTimes(scheduledDate, blocks, {
            startTime: BOOKING_ARRIVAL_START,
            endTime: BOOKING_ARRIVAL_END,
            intervalMinutes: BOOKING_ARRIVAL_INTERVAL_MINUTES,
          })
        : [],
    [scheduledDate, blocks],
  );

  useEffect(() => {
    const fallbackDate = firstSelectableDate(minDate, BOOKING_SCHEDULE_HORIZON_DAYS, blocks);
    if (!fallbackDate) return;

    if (
      !scheduledDate ||
      !isDateSelectable(scheduledDate, minDate, maxDate, blocks)
    ) {
      onDateChange(fallbackDate);
      return;
    }

    if (availableTimes.length === 0) {
      onDateChange(fallbackDate);
      return;
    }

    if (!availableTimes.includes(arrivalWindow)) {
      onTimeChange(availableTimes[0] ?? DEFAULT_ARRIVAL_TIME);
    }
  }, [
    scheduledDate,
    arrivalWindow,
    blocks,
    minDate,
    maxDate,
    availableTimes,
    onDateChange,
    onTimeChange,
  ]);

  const monthLabel = visibleMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const calendarCells = buildCalendarCells(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
  );

  const minMonth = parseDateString(minDate);
  const maxMonth = parseDateString(maxDate);
  const canGoPrev =
    visibleMonth.getFullYear() > minMonth.getFullYear() ||
    (visibleMonth.getFullYear() === minMonth.getFullYear() &&
      visibleMonth.getMonth() > minMonth.getMonth());
  const canGoNext =
    visibleMonth.getFullYear() < maxMonth.getFullYear() ||
    (visibleMonth.getFullYear() === maxMonth.getFullYear() &&
      visibleMonth.getMonth() < maxMonth.getMonth());

  const goPrevMonth = () => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  };

  const partialBlocks = scheduledDate
    ? blocks.filter((block) => block.date === scheduledDate && !block.allDay)
    : [];

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Preferred date</Label>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={goPrevMonth}
              disabled={!canGoPrev}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="font-medium text-brand-navy">{monthLabel}</p>
            <button
              type="button"
              onClick={goNextMonth}
              disabled={!canGoNext}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-1 font-medium">
                {label}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarCells.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} aria-hidden />;
              }

              const dateStr = toDateString(date);
              const selectable = isDateSelectable(dateStr, minDate, maxDate, blocks);
              const selected = scheduledDate === dateStr;
              const blockedReason = getFullyBlockedReason(dateStr, blocks);

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={!selectable}
                  title={
                    !selectable
                      ? blockedReason ?? "Unavailable"
                      : undefined
                  }
                  onClick={() => onDateChange(dateStr)}
                  className={cn(
                    "h-10 rounded-lg text-sm transition-colors",
                    selected && "bg-primary text-primary-foreground font-semibold",
                    !selected &&
                      selectable &&
                      "hover:bg-secondary text-brand-navy",
                    !selectable &&
                      "cursor-not-allowed text-muted-foreground/50 line-through decoration-muted-foreground/40",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Crossed-out dates are unavailable. You can book up to{" "}
            {BOOKING_SCHEDULE_HORIZON_DAYS} days ahead.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-time`}>Preferred arrival time</Label>
        <select
          id={`${idPrefix}-time`}
          value={availableTimes.includes(arrivalWindow) ? arrivalWindow : ""}
          onChange={(event) => onTimeChange(event.target.value)}
          disabled={!scheduledDate || availableTimes.length === 0}
          className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {availableTimes.length === 0 ? (
            <option value="">No times available</option>
          ) : (
            availableTimes.map((slot) => (
              <option key={slot} value={slot}>
                {displayArrivalTime(slot)}
              </option>
            ))
          )}
        </select>
        <p className="text-xs text-muted-foreground">
          Only available arrival times are shown.
        </p>
        {partialBlocks.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Some times on this date are blocked by the team schedule.
          </p>
        )}
      </div>
    </div>
  );
}
