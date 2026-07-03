"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, CalendarClock, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { minScheduleDateString } from "@/config/booking";
import {
  BOOKING_POLICY_LINKS,
  getBookingPolicyHighlights,
} from "@/content/booking-policy-snippets";
import {
  cancelCustomerBooking,
  rescheduleCustomerBooking,
} from "@/features/dashboard/actions";
import { isWithinLateChangeWindow } from "@/features/dashboard/booking-rules";
import { displayArrivalTime } from "@/lib/format-arrival-time";
import { cn } from "@/lib/utils";

type DialogMode = "cancel" | "reschedule" | null;

export function BookingManagePanel({
  bookingId,
  scheduledDate,
  arrivalWindow,
  canCancel,
  canReschedule,
}: {
  bookingId: string;
  scheduledDate: string;
  arrivalWindow: string;
  canCancel: boolean;
  canReschedule: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<DialogMode>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState(arrivalWindow.match(/^\d{2}:\d{2}$/) ? arrivalWindow : "09:00");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canCancel && !canReschedule) return null;

  const lateWindow = isWithinLateChangeWindow(scheduledDate, arrivalWindow);
  const highlights = mode ? getBookingPolicyHighlights(mode) : [];

  const openDialog = (next: DialogMode) => {
    setMode(next);
    setAcknowledged(false);
    setError(null);
    if (next === "reschedule") {
      const current = new Date(scheduledDate);
      setNewDate(current.toISOString().slice(0, 10));
      setNewTime(arrivalWindow.match(/^\d{2}:\d{2}$/) ? arrivalWindow : "09:00");
    }
  };

  const closeDialog = () => {
    if (pending) return;
    setMode(null);
    setAcknowledged(false);
    setError(null);
  };

  const onConfirm = () => {
    if (!mode || !acknowledged) return;
    setError(null);

    startTransition(async () => {
      const result =
        mode === "cancel"
          ? await cancelCustomerBooking({ bookingId, acknowledged: true })
          : await rescheduleCustomerBooking({
              bookingId,
              scheduledDate: newDate,
              arrivalWindow: newTime,
              acknowledged: true,
            });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      closeDialog();
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        {canReschedule && (
          <Button type="button" variant="outline" onClick={() => openDialog("reschedule")}>
            <CalendarClock className="h-4 w-4" />
            Reschedule
          </Button>
        )}
        {canCancel && (
          <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => openDialog("cancel")}>
            <XCircle className="h-4 w-4" />
            Cancel booking
          </Button>
        )}
      </div>

      <Dialog open={mode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "cancel" ? "Cancel this booking?" : "Reschedule this booking?"}
            </DialogTitle>
            <DialogDescription>
              Please read the key points from our cancellation policy before you continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {lateWindow && (
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Your appointment is within 48 hours.{" "}
                  {mode === "cancel"
                    ? "Cancellations this close to the service time may forfeit part or all of your payment."
                    : "Rescheduling this close to the service time may not be free — contact us if you need help."}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3">
              <p className="text-sm font-medium text-brand-navy">Important policy reminders</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {highlights.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <Link
                href={BOOKING_POLICY_LINKS.cancellation}
                className="mt-3 inline-block text-sm text-brand-blue hover:underline"
                target="_blank"
              >
                Read full cancellation policy
              </Link>
            </div>

            {mode === "reschedule" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reschedule-date">New date</Label>
                  <Input
                    id="reschedule-date"
                    type="date"
                    min={minScheduleDateString()}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reschedule-time">Arrival time</Label>
                  <Input
                    id="reschedule-time"
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    required
                  />
                  {newTime && (
                    <p className="text-xs text-muted-foreground">
                      {displayArrivalTime(newTime)}
                    </p>
                  )}
                </div>
              </div>
            )}

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span>
                I understand the{" "}
                {mode === "cancel" ? "cancellation" : "rescheduling and cancellation"} policy and
                want to proceed.
              </span>
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={pending}>
              Keep booking
            </Button>
            <Button
              type="button"
              variant={mode === "cancel" ? "destructive" : "default"}
              disabled={!acknowledged || pending || (mode === "reschedule" && (!newDate || !newTime))}
              onClick={onConfirm}
              className={cn(mode === "cancel" && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : mode === "cancel" ? (
                "Confirm cancellation"
              ) : (
                "Confirm reschedule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
