"use client";

import { Check } from "lucide-react";

import { BOOKING_WIZARD_STEPS } from "@/config/booking";
import { cn } from "@/lib/utils";

interface BookingProgressProps {
  stepIndex: number;
}

export function BookingProgress({ stepIndex }: BookingProgressProps) {
  const current = BOOKING_WIZARD_STEPS[stepIndex];
  const progress = ((stepIndex + 1) / BOOKING_WIZARD_STEPS.length) * 100;

  return (
    <>
      <div className="space-y-2.5 md:hidden" aria-label="Booking progress">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-brand-navy">
            Step {stepIndex + 1} of {BOOKING_WIZARD_STEPS.length}
          </p>
          <p className="text-sm text-muted-foreground">{current.label}</p>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={BOOKING_WIZARD_STEPS.length}
          aria-label={`${current.label} step`}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <nav aria-label="Booking progress" className="hidden md:block">
        <ol className="flex flex-wrap gap-2">
          {BOOKING_WIZARD_STEPS.map((step, index) => {
            const done = index < stepIndex;
            const active = index === stepIndex;

            return (
              <li
                key={step.id}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  done && "bg-accent/15 text-brand-green",
                  active && "bg-primary text-primary-foreground",
                  !done && !active && "bg-secondary text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                    done && "bg-accent text-white",
                    active && "bg-primary-foreground/20",
                    !done && !active && "bg-background",
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {step.label}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
