"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";

import { BOOKING_WIZARD_STEPS, DEFAULT_ARRIVAL_TIME, minScheduleDateString } from "@/config/booking";
import { displayArrivalTime } from "@/lib/format-arrival-time";
import { createDepositCheckout } from "@/features/payments/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { useQuoteStore } from "@/features/quote/store";
import { formatCurrency } from "@/lib/utils";

import { createBooking } from "../actions";
import {
  accessStepSchema,
  agreementStepSchema,
  propertyStepSchema,
  scheduleStepSchema,
} from "../schema";
import { useBookingWizardStore } from "../store";
import { BookingProgress } from "./booking-progress";
import { BookingSummary } from "./booking-summary";
import { PhotoUploader } from "./photo-uploader";
import { ScheduleAvailabilityNotice } from "./schedule-availability-notice";
import { useScheduleBlocks } from "../hooks/use-schedule-blocks";
import {
  blocksForDate,
  getScheduleBlockMessage,
} from "../schedule-block-utils";

export function BookingWizard() {
  const authUser = useAuthUser();
  const quote = useQuoteStore((s) => s.draft);
  const clearQuote = useQuoteStore((s) => s.clearDraft);

  const stepIndex = useBookingWizardStore((s) => s.stepIndex);
  const property = useBookingWizardStore((s) => s.property);
  const photos = useBookingWizardStore((s) => s.photos);
  const schedule = useBookingWizardStore((s) => s.schedule);
  const access = useBookingWizardStore((s) => s.access);
  const agreement = useBookingWizardStore((s) => s.agreement);
  const setStepIndex = useBookingWizardStore((s) => s.setStepIndex);
  const setProperty = useBookingWizardStore((s) => s.setProperty);
  const setPhotos = useBookingWizardStore((s) => s.setPhotos);
  const setSchedule = useBookingWizardStore((s) => s.setSchedule);
  const setAccess = useBookingWizardStore((s) => s.setAccess);
  const setAgreement = useBookingWizardStore((s) => s.setAgreement);
  const resetWizard = useBookingWizardStore((s) => s.resetWizard);

  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { blocks: scheduleBlocks } = useScheduleBlocks();

  useEffect(() => {
    if (!quote) resetWizard();
  }, [quote, resetWizard]);

  if (!quote) {
    return null;
  }

  const goNext = () => {
    setStepError(null);

    if (stepIndex === 0) {
      if (authUser === undefined) return;
      if (authUser === null) {
        setStepError("Sign in or create an account below to continue with your booking.");
        return;
      }
      const parsed = propertyStepSchema.safeParse(property);
      if (!parsed.success) {
        setStepError(parsed.error.errors[0]?.message ?? "Check property details");
        return;
      }
      setStepIndex(1);
      return;
    }

    if (stepIndex === 1) {
      const parsed = scheduleStepSchema.safeParse(schedule);
      if (!parsed.success) {
        setStepError(parsed.error.errors[0]?.message ?? "Check schedule details");
        return;
      }
      const blockMessage = getScheduleBlockMessage(
        parsed.data.arrivalWindow,
        blocksForDate(scheduleBlocks, parsed.data.scheduledDate),
      );
      if (blockMessage) {
        setStepError(blockMessage);
        return;
      }
      setStepIndex(2);
      return;
    }

    if (stepIndex === 2) {
      const parsed = accessStepSchema.safeParse(access);
      if (!parsed.success) {
        setStepError(parsed.error.errors[0]?.message ?? "Check access details");
        return;
      }
      setStepIndex(3);
      return;
    }

    if (stepIndex === 3) {
      const parsed = agreementStepSchema.safeParse(agreement);
      if (!parsed.success) {
        setStepError(parsed.error.errors[0]?.message ?? "Complete the agreement");
        return;
      }
      void onSubmitBooking();
    }
  };

  const goBack = () => {
    setStepError(null);
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const onSubmitBooking = async () => {
    setStepError(null);
    setSubmitting(true);

    const result = await createBooking({
      quoteId: quote.quoteId,
      ...property,
      ...schedule,
      ...access,
      agreement: {
        acceptedTerms: agreement.acceptedTerms ?? false,
        acceptedCancellation: agreement.acceptedCancellation ?? false,
        acceptedLiability: agreement.acceptedLiability ?? false,
        signatureName: agreement.signatureName ?? "",
      },
      photos: photos.map(({ s3Key, url }) => ({ s3Key, url })),
    });

    setSubmitting(false);

    if (!result.ok) {
      setStepError(result.error);
      return;
    }

    clearQuote();
    resetWizard();

    const checkout = await createDepositCheckout(result.bookingId);
    if (checkout.ok) {
      window.location.href = checkout.url;
      return;
    }

    window.location.href = `/book/confirmation/${result.bookingId}`;
  };

  const currentStep = BOOKING_WIZARD_STEPS[stepIndex];

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-start lg:gap-8">
      <div className="min-w-0 space-y-6">
        <BookingProgress stepIndex={stepIndex} />

        <Card>
          <CardHeader>
            <CardTitle>{stepTitle(currentStep.id)}</CardTitle>
            <CardDescription>{stepDescription(currentStep.id)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {stepIndex === 0 && (
              <>
                {authUser === undefined ? (
                  <p className="text-sm text-muted-foreground">Checking your account…</p>
                ) : authUser ? (
                  <p className="text-sm text-muted-foreground">
                    Signed in as{" "}
                    <span className="font-medium text-brand-navy">
                      {authUser.firstName
                        ? `${authUser.firstName} ${authUser.lastName ?? ""}`.trim()
                        : authUser.phone}
                    </span>
                  </p>
                ) : (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <p className="font-medium text-brand-navy">Account required to book</p>
                    <p className="text-sm text-muted-foreground">
                      Sign in or create an account to continue — it only takes a minute with your
                      phone number.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild>
                        <Link href="/login?next=/book">
                          <LogIn className="h-4 w-4" />
                          Sign in
                        </Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link href="/register?next=/book">
                          <UserPlus className="h-4 w-4" />
                          Create account
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="addressLine">Street address</Label>
                    <Input
                      id="addressLine"
                      placeholder="123 Main St, Apt 4"
                      value={property.addressLine ?? ""}
                      onChange={(e) => setProperty({ addressLine: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={property.city ?? ""}
                      onChange={(e) => setProperty({ city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">ZIP / postal code</Label>
                    <Input
                      id="postalCode"
                      value={property.postalCode ?? ""}
                      onChange={(e) => setProperty({ postalCode: e.target.value })}
                    />
                  </div>
                </div>

                {quote.hasPets && (
                  <div className="space-y-2">
                    <Label htmlFor="petNotes">Pet notes (optional)</Label>
                    <Textarea
                      id="petNotes"
                      placeholder="Tell us about your pets — type, areas to avoid, etc."
                      value={property.petNotes ?? ""}
                      onChange={(e) => setProperty({ petNotes: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Property photos</Label>
                  <PhotoUploader photos={photos} onChange={setPhotos} />
                </div>
              </>
            )}

            {stepIndex === 1 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate">Preferred date</Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      min={minScheduleDateString()}
                      value={schedule.scheduledDate ?? ""}
                      onChange={(e) => setSchedule({ scheduledDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arrivalTime">Preferred arrival time</Label>
                  <Input
                    id="arrivalTime"
                    type="time"
                    value={schedule.arrivalWindow ?? DEFAULT_ARRIVAL_TIME}
                    onChange={(e) => setSchedule({ arrivalWindow: e.target.value })}
                    className="max-w-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Choose when you&apos;d like our team to arrive.
                  </p>
                </div>
                <ScheduleAvailabilityNotice
                  blocks={scheduleBlocks}
                  scheduledDate={schedule.scheduledDate ?? ""}
                  arrivalWindow={schedule.arrivalWindow ?? DEFAULT_ARRIVAL_TIME}
                />
              </>
            )}

            {stepIndex === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="accessInfo">How do we get in?</Label>
                  <Textarea
                    id="accessInfo"
                    placeholder="Gate code, lockbox, concierge, key under mat…"
                    value={access.accessInfo ?? ""}
                    onChange={(e) => setAccess({ accessInfo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialInstructions">Special instructions (optional)</Label>
                  <Textarea
                    id="specialInstructions"
                    placeholder="Focus areas, fragile items, parking notes…"
                    value={access.specialInstructions ?? ""}
                    onChange={(e) => setAccess({ specialInstructions: e.target.value })}
                  />
                </div>
              </>
            )}

            {stepIndex === 3 && (
              <>
                <dl className="mb-4 grid gap-2 rounded-xl bg-secondary/40 px-4 py-3 text-sm sm:grid-cols-2">
                  <ReviewItem
                    label="Address"
                    value={`${property.addressLine ?? "—"}, ${property.city ?? ""} ${property.postalCode ?? ""}`}
                  />
                  <ReviewItem
                    label="Date"
                    value={
                      schedule.scheduledDate
                        ? new Date(schedule.scheduledDate + "T12:00:00").toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"
                    }
                  />
                  <ReviewItem
                    label="Arrival"
                    value={
                      schedule.arrivalWindow
                        ? displayArrivalTime(schedule.arrivalWindow)
                        : "—"
                    }
                  />
                  <ReviewItem label="Total" value={formatCurrency(quote.calculation.estimatedTotalCents)} />
                </dl>

                <AgreementCheckbox
                  id="acceptedTerms"
                  checked={agreement.acceptedTerms ?? false}
                  onChange={(v) => setAgreement({ acceptedTerms: v ? true : undefined })}
                  label={
                    <>
                      I accept the{" "}
                      <Link href="/legal/agreement" className="text-primary underline" target="_blank">
                        Cleaning Service Agreement
                      </Link>{" "}
                      and{" "}
                      <Link href="/legal/booking-terms" className="text-primary underline" target="_blank">
                        Booking Terms
                      </Link>
                    </>
                  }
                />
                <AgreementCheckbox
                  id="acceptedCancellation"
                  checked={agreement.acceptedCancellation ?? false}
                  onChange={(v) => setAgreement({ acceptedCancellation: v ? true : undefined })}
                  label={
                    <>
                      I accept the{" "}
                      <Link href="/legal/cancellation" className="text-primary underline" target="_blank">
                        Cancellation Policy
                      </Link>
                    </>
                  }
                />
                <AgreementCheckbox
                  id="acceptedLiability"
                  checked={agreement.acceptedLiability ?? false}
                  onChange={(v) => setAgreement({ acceptedLiability: v ? true : undefined })}
                  label={
                    <>
                      I accept the{" "}
                      <Link href="/legal/liability" className="text-primary underline" target="_blank">
                        Liability Policy
                      </Link>
                    </>
                  }
                />

                <div className="space-y-2 border-t border-border pt-4">
                  <Label htmlFor="signatureName">Electronic signature — type your full name</Label>
                  <Input
                    id="signatureName"
                    placeholder="Jane Smith"
                    value={agreement.signatureName ?? ""}
                    onChange={(e) => setAgreement({ signatureName: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    By typing your name, you agree this constitutes your legal electronic signature.
                  </p>
                </div>
              </>
            )}

            {stepError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {stepError}
              </p>
            )}

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:flex-wrap">
              {stepIndex > 0 && (
                <Button type="button" variant="outline" onClick={goBack} className="w-full sm:w-auto">
                  Back
                </Button>
              )}
              {stepIndex < 3 ? (
                <Button
                  type="button"
                  onClick={goNext}
                  disabled={authUser === undefined || (stepIndex === 0 && authUser === null)}
                  className="w-full sm:w-auto"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={onSubmitBooking}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  {submitting ? "Processing…" : "Confirm & pay"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 lg:sticky lg:top-24">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Booking summary</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingSummary quote={quote} property={property} schedule={schedule} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AgreementCheckbox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-3"
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm leading-relaxed text-brand-navy">{label}</span>
    </label>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-brand-navy">{value}</dd>
    </div>
  );
}

function stepTitle(id: string): string {
  const titles: Record<string, string> = {
    property: "Property details",
    schedule: "Pick a date & time",
    access: "Access & notes",
    agreement: "Confirm & pay",
  };
  return titles[id] ?? "Book";
}

function stepDescription(id: string): string {
  const descriptions: Record<string, string> = {
    property: "Where should we clean? Photos help our team prepare.",
    schedule: "Choose your preferred date and arrival window.",
    access: "Share how we get in and anything we should know.",
    agreement: "Agreements, review your details, and proceed to secure payment.",
  };
  return descriptions[id] ?? "";
}
