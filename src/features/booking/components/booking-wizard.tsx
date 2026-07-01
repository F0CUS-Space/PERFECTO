"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { ARRIVAL_WINDOWS, BOOKING_WIZARD_STEPS, minScheduleDateString } from "@/config/booking";
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
import { cn, formatCurrency } from "@/lib/utils";

import { createBooking } from "../actions";
import {
  accessStepSchema,
  agreementStepSchema,
  propertyStepSchema,
  scheduleStepSchema,
} from "../schema";
import { useBookingWizardStore } from "../store";
import { BookingSummary } from "./booking-summary";
import { PhotoUploader } from "./photo-uploader";

export function BookingWizard() {
  const router = useRouter();
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

  useEffect(() => {
    if (!quote) resetWizard();
  }, [quote, resetWizard]);

  if (!quote) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <CardHeader>
          <CardTitle>Start with a quote</CardTitle>
          <CardDescription>
            Our booking wizard uses your instant quote estimate. Get a transparent price first,
            then come back here to schedule your clean.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg">
            <Link href="/quote">Get an instant quote</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const requireAuth = (targetStep: number) => {
    if (authUser === undefined) return false;
    if (authUser === null) {
      router.push(`/login?next=${encodeURIComponent("/book")}`);
      return false;
    }
    setStepIndex(targetStep);
    setStepError(null);
    return true;
  };

  const goNext = () => {
    setStepError(null);

    if (stepIndex === 0) {
      if (!requireAuth(1)) return;
      return;
    }

    if (stepIndex === 1) {
      const parsed = propertyStepSchema.safeParse(property);
      if (!parsed.success) {
        setStepError(parsed.error.errors[0]?.message ?? "Check property details");
        return;
      }
      setStepIndex(2);
      return;
    }

    if (stepIndex === 2) {
      const parsed = scheduleStepSchema.safeParse(schedule);
      if (!parsed.success) {
        setStepError(parsed.error.errors[0]?.message ?? "Check schedule details");
        return;
      }
      setStepIndex(3);
      return;
    }

    if (stepIndex === 3) {
      const parsed = accessStepSchema.safeParse(access);
      if (!parsed.success) {
        setStepError(parsed.error.errors[0]?.message ?? "Check access details");
        return;
      }
      setStepIndex(4);
      return;
    }

    if (stepIndex === 4) {
      const parsed = agreementStepSchema.safeParse(agreement);
      if (!parsed.success) {
        setStepError(parsed.error.errors[0]?.message ?? "Complete the agreement");
        return;
      }
      setStepIndex(5);
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
    router.push(`/book/confirmation/${result.bookingId}`);
  };

  const currentStep = BOOKING_WIZARD_STEPS[stepIndex];

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-6">
        <nav aria-label="Booking progress" className="overflow-x-auto">
          <ol className="flex min-w-max gap-2">
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
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
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

        <Card>
          <CardHeader>
            <CardTitle>{stepTitle(currentStep.id)}</CardTitle>
            <CardDescription>{stepDescription(currentStep.id)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {stepIndex === 0 && (
              <div className="space-y-4">
                <BookingSummary quote={quote} compact />
                <p className="text-sm text-muted-foreground">
                  Happy with your estimate? Continue to add your property details and schedule your
                  visit. You&apos;ll need to sign in before booking.
                </p>
              </div>
            )}

            {stepIndex === 1 && (
              <>
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

            {stepIndex === 2 && (
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

                <div className="space-y-3">
                  <Label>Arrival window</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {ARRIVAL_WINDOWS.map((window) => (
                      <label
                        key={window.value}
                        className={cn(
                          "cursor-pointer rounded-xl border px-4 py-3 transition-colors",
                          schedule.arrivalWindow === window.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:bg-secondary/40",
                        )}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <input
                            type="radio"
                            name="arrivalWindow"
                            className="accent-primary"
                            checked={schedule.arrivalWindow === window.value}
                            onChange={() => setSchedule({ arrivalWindow: window.value })}
                          />
                          {window.label}
                        </span>
                        <span className="mt-1 block pl-6 text-xs text-muted-foreground">
                          {window.hint}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {stepIndex === 3 && (
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

            {stepIndex === 4 && (
              <>
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

            {stepIndex === 5 && (
              <div className="space-y-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <ReviewItem label="Address" value={`${property.addressLine}, ${property.city} ${property.postalCode}`} />
                  <ReviewItem
                    label="Date"
                    value={
                      schedule.scheduledDate
                        ? new Date(schedule.scheduledDate + "T12:00:00").toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })
                        : "—"
                    }
                  />
                  <ReviewItem label="Arrival window" value={schedule.arrivalWindow ?? "—"} />
                  <ReviewItem label="Signed by" value={agreement.signatureName ?? "—"} />
                  <ReviewItem label="Photos" value={String(photos.length)} />
                </dl>

                <div className="rounded-xl bg-secondary/40 px-4 py-3 text-sm">
                  <p className="font-medium text-brand-navy">Payment next</p>
                  <p className="mt-1 text-muted-foreground">
                    After confirming, you&apos;ll pay a{" "}
                    {formatCurrency(quote.calculation.depositCents)} deposit (50%) to secure your
                    booking. Payment processing arrives in the next milestone.
                  </p>
                </div>
              </div>
            )}

            {stepError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {stepError}
              </p>
            )}

            <div className="flex flex-wrap gap-3 border-t border-border pt-4">
              {stepIndex > 0 && (
                <Button type="button" variant="outline" onClick={goBack}>
                  Back
                </Button>
              )}
              {stepIndex < 5 ? (
                <Button type="button" onClick={goNext} disabled={authUser === undefined && stepIndex === 0}>
                  {stepIndex === 0 && authUser === null ? "Sign in to continue" : "Continue"}
                </Button>
              ) : (
                <Button type="button" onClick={onSubmitBooking} disabled={submitting}>
                  {submitting ? "Creating booking…" : "Confirm booking"}
                </Button>
              )}
              {stepIndex === 0 && (
                <Button asChild variant="ghost">
                  <Link href="/quote">Adjust quote</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-24">
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
    quote: "Review your quote",
    property: "Property details",
    schedule: "Pick a date & time",
    access: "Access & notes",
    agreement: "Agreements & signature",
    review: "Review & confirm",
  };
  return titles[id] ?? "Book";
}

function stepDescription(id: string): string {
  const descriptions: Record<string, string> = {
    quote: "Confirm the service and estimate before continuing.",
    property: "Where should we clean? Photos help our team prepare.",
    schedule: "Choose your preferred date and arrival window.",
    access: "Share how we get in and anything we should know.",
    agreement: "Read and accept our policies, then sign electronically.",
    review: "Double-check everything before we create your booking.",
  };
  return descriptions[id] ?? "";
}
