"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarOff, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createScheduleBlock, deleteScheduleBlock } from "@/features/admin/actions";
import { displayArrivalTime } from "@/lib/format-arrival-time";

type ScheduleBlockRow = {
  id: string;
  blockDate: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: string;
  createdByLabel: string;
};

export function ScheduleBlocksManager({ blocks }: { blocks: ScheduleBlockRow[] }) {
  const router = useRouter();
  const [blockDate, setBlockDate] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onCreate = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createScheduleBlock({
        blockDate,
        allDay,
        startTime: allDay ? undefined : startTime,
        endTime: allDay ? undefined : endTime,
        reason: reason.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBlockDate("");
      setReason("");
      setAllDay(true);
      router.refresh();
    });
  };

  const onDelete = (id: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteScheduleBlock(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      <form onSubmit={onCreate} className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <CalendarOff className="h-5 w-5 text-brand-navy" />
          <h2 className="font-semibold text-brand-navy">Block a date or time</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Customers cannot book on blocked dates or during blocked arrival times. Existing bookings
          are not affected.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="block-date">Date</Label>
            <Input
              id="block-date"
              type="date"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Block type</Label>
            <div className="flex flex-wrap gap-3 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="block-type"
                  checked={allDay}
                  onChange={() => setAllDay(true)}
                />
                Entire day
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="block-type"
                  checked={!allDay}
                  onChange={() => setAllDay(false)}
                />
                Specific times
              </label>
            </div>
          </div>
        </div>

        {!allDay && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="block-start">From</Label>
              <Input
                id="block-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-end">Until</Label>
              <Input
                id="block-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="block-reason">Reason (optional, shown to customers)</Label>
          <Textarea
            id="block-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Holiday, team training, fully booked…"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={pending || !blockDate}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add block"}
        </Button>
      </form>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-brand-navy">Upcoming blocks</h2>
        </div>
        {blocks.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">No upcoming schedule blocks.</p>
        ) : (
          <ul className="divide-y divide-border">
            {blocks.map((block) => (
              <li
                key={block.id}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
              >
                <div>
                  <p className="font-medium text-brand-navy">
                    {new Date(block.blockDate + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {block.allDay
                      ? "Entire day blocked"
                      : `${displayArrivalTime(block.startTime ?? "09:00")} – ${displayArrivalTime(block.endTime ?? "12:00")}`}
                  </p>
                  {block.reason && (
                    <p className="mt-1 text-sm text-muted-foreground">{block.reason}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Added by {block.createdByLabel}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={pending}
                  onClick={() => onDelete(block.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
