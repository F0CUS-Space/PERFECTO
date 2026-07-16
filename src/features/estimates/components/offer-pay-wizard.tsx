"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

import { DEFAULT_ARRIVAL_TIME } from "@/config/booking";
import { displayArrivalTime } from "@/lib/format-arrival-time";
import { formatCurrency } from "@/lib/utils";
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
import { SchedulePicker } from "@/features/booking/components/schedule-picker";
import { useScheduleBlocks } from "@/features/booking/hooks/use-schedule-blocks";
import {
  accessStepSchema,
  agreementStepSchema,
  propertyStepSchema,
  scheduleStepSchema,
} from "@/features/booking/schema";
import {
  blocksForDate,
  getScheduleBlockMessage,
  isScheduleSlotBlocked,
} from "@/features/booking/schedule-block-utils";
import { completeBookingOffer } from "@/features/estimates/actions";
import { createDepositCheckout } from "@/features/payments/actions";
import type { PublicOfferSnapshot } from "@/features/estimates/types";

const STEPS = [
  { id: "schedule", title: "Pick a date & time", description: "Choose when you'd like us to arrive." },
  {
    id: "details",
    title: "Address & access",
    description: "Tell us where to clean and how to get in.",
  },
  {
    id: "review",
    title: "Review & pay",
    description: "Confirm your estimate details and complete secure payment.",
  },
] as const;

export function OfferPayWizard({ offer }: { offer: PublicOfferSnapshot }) {
  const authUser = useAuthUser();
  const nextPath = `/book/offer/${offer.token}`;
  const { blocks: scheduleBlocks } = useScheduleBlocks();

  const [stepIndex, setStepIndex] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [scheduledDate, setScheduledDate] = useState("");
  const [arrivalWindow, setArrivalWindow] = useState(DEFAULT_ARRIVAL_TIME);
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [petNotes, setPetNotes] = useState("");
  const [accessInfo, setAccessInfo] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedCancellation, setAcceptedCancellation] = useState(false);
  const [acceptedLiability, setAcceptedLiability] = useState(false);
  const [signatureName, setSignatureName] = useState("");

  const scheduleBlocked = isScheduleSlotBlocked(
    scheduledDate,
    arrivalWindow,
    scheduleBlocks,
  );

  const wrongAccount = Boolean(
    authUser && offer.userId && authUser.id !== offer.userId,
  );

  const canProceed = useMemo(() => {
    if (authUser === undefined || authUser === null) return false;
    if (wrongAccount) return false;
    return true;
  }, [authUser, wrongAccount]);

  const goNext = () => {
    setStepError(null);
    if (!canProceed) {
      setStepError("Please sign in to continue.");
      return;
    }

    if (stepIndex === 0) {
      const parsed = scheduleStepSchema.safeParse({ scheduledDate, arrivalWindow });
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
      setStepIndex(1);
      return;
    }

    if (stepIndex === 1) {
      const property = propertyStepSchema.safeParse({
        addressLine,
        city,
        postalCode,
        petNotes: petNotes || undefined,
      });
      if (!property.success) {
        setStepError(property.error.errors[0]?.message ?? "Check address details");
        return;
      }
      const access = accessStepSchema.safeParse({
        accessInfo: accessInfo || undefined,
        specialInstructions: specialInstructions || undefined,
      });
      if (!access.success) {
        setStepError(access.error.errors[0]?.message ?? "Check access details");
        return;
      }
      setStepIndex(2);
    }
  };

  const onSubmit = async () => {
    setStepError(null);
    if (!canProceed) {
      setStepError("Please sign in to continue.");
      return;
    }

    const agreement = agreementStepSchema.safeParse({
      acceptedTerms: acceptedTerms ? true : undefined,
      acceptedCancellation: acceptedCancellation ? true : undefined,
      acceptedLiability: acceptedLiability ? true : undefined,
      signatureName,
    });
    if (!agreement.success) {
      setStepError(agreement.error.errors[0]?.message ?? "Complete the agreement");
      return;
    }

    if (scheduleBlocked) {
      setStepError(
        getScheduleBlockMessage(arrivalWindow, blocksForDate(scheduleBlocks, scheduledDate)) ??
          "This schedule is no longer available.",
      );
      return;
    }

    setSubmitting(true);
    const result = await completeBookingOffer({
      token: offer.token,
      scheduledDate,
      arrivalWindow,
      addressLine,
      city,
      postalCode,
      petNotes: petNotes || undefined,
      accessInfo: accessInfo || undefined,
      specialInstructions: specialInstructions || undefined,
      agreement: {
        acceptedTerms: true,
        acceptedCancellation: true,
        acceptedLiability: true,
        signatureName,
      },
    });
    setSubmitting(false);

    if (!result.ok) {
      setStepError(result.error);
      return;
    }

    if (!result.bookingId) {
      setStepError("Booking created, but checkout could not start. Check your dashboard.");
      return;
    }

    const checkout = await createDepositCheckout(result.bookingId);
    if (checkout.ok) {
      window.location.href = checkout.url;
      return;
    }

    window.location.href = `/book/confirmation/${result.bookingId}`;
  };

  const step = STEPS[stepIndex];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-start">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {STEPS.map((item, index) => (
            <span
              key={item.id}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                index === stepIndex
                  ? "bg-brand-blue text-white"
                  : index < stepIndex
                    ? "bg-accent/15 text-brand-green"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {index + 1}. {item.title}
            </span>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{step.title}</CardTitle>
            <CardDescription>{step.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {authUser === undefined ? (
              <p className="text-sm text-muted-foreground">Checking your account…</p>
            ) : !authUser ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <p className="font-medium text-brand-navy">Sign in to continue</p>
                <p className="text-sm text-muted-foreground">
                  Create an account or sign in to pick a time and pay this estimate.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>Sign in</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/register?next=${encodeURIComponent(nextPath)}`}>Sign up</Link>
                  </Button>
                </div>
              </div>
            ) : wrongAccount ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                <p className="font-medium text-brand-navy">Wrong account</p>
                <p className="text-sm text-muted-foreground">
                  This estimate was prepared for a different customer. Sign in with the phone
                  number used when the estimate was created.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Signed in as{" "}
                <span className="font-medium text-brand-navy">
                  {authUser.firstName
                    ? `${authUser.firstName} ${authUser.lastName ?? ""}`.trim()
                    : authUser.phone}
                </span>
              </p>
            )}

            {stepIndex === 0 && (
              <SchedulePicker
                scheduledDate={scheduledDate}
                arrivalWindow={arrivalWindow}
                blocks={scheduleBlocks}
                onDateChange={setScheduledDate}
                onTimeChange={setArrivalWindow}
              />
            )}

            {stepIndex === 1 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="addressLine">Street address</Label>
                    <Input
                      id="addressLine"
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      placeholder="123 Main St, Apt 4"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">ZIP / postal code</Label>
                    <Input
                      id="postalCode"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessInfo">How do we get in?</Label>
                  <Textarea
                    id="accessInfo"
                    value={accessInfo}
                    onChange={(e) => setAccessInfo(e.target.value)}
                    placeholder="Gate code, lockbox, concierge…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialInstructions">Special instructions (optional)</Label>
                  <Textarea
                    id="specialInstructions"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Focus areas, fragile items, parking notes…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="petNotes">Pet notes (optional)</Label>
                  <Textarea
                    id="petNotes"
                    value={petNotes}
                    onChange={(e) => setPetNotes(e.target.value)}
                    placeholder="Tell us about pets if relevant…"
                  />
                </div>
              </>
            )}

            {stepIndex === 2 && (
              <>
                <dl className="mb-2 grid gap-2 rounded-xl bg-secondary/40 px-4 py-3 text-sm sm:grid-cols-2">
                  <ReviewItem
                    label="Address"
                    value={`${addressLine || "—"}, ${city} ${postalCode}`.trim()}
                  />
                  <ReviewItem
                    label="Date"
                    value={
                      scheduledDate
                        ? new Date(`${scheduledDate}T12:00:00`).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"
                    }
                  />
                  <ReviewItem label="Arrival" value={displayArrivalTime(arrivalWindow)} />
                  <ReviewItem label="Total" value={formatCurrency(offer.totalAmount)} />
                </dl>

                <AgreementCheckbox
                  id="acceptedTerms"
                  checked={acceptedTerms}
                  onChange={setAcceptedTerms}
                  label={
                    <>
                      I accept the{" "}
                      <Link href="/legal/agreement" className="text-primary underline" target="_blank">
                        Cleaning Service Agreement
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/legal/booking-terms"
                        className="text-primary underline"
                        target="_blank"
                      >
                        Booking Terms
                      </Link>
                    </>
                  }
                />
                <AgreementCheckbox
                  id="acceptedCancellation"
                  checked={acceptedCancellation}
                  onChange={setAcceptedCancellation}
                  label={
                    <>
                      I accept the{" "}
                      <Link
                        href="/legal/cancellation"
                        className="text-primary underline"
                        target="_blank"
                      >
                        Cancellation Policy
                      </Link>
                    </>
                  }
                />
                <AgreementCheckbox
                  id="acceptedLiability"
                  checked={acceptedLiability}
                  onChange={setAcceptedLiability}
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
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="Jane Smith"
                  />
                </div>
              </>
            )}

            {stepError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {stepError}
              </p>
            )}

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row">
              {stepIndex > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStepError(null);
                    setStepIndex((i) => i - 1);
                  }}
                >
                  Back
                </Button>
              )}
              {stepIndex < 2 ? (
                <Button
                  type="button"
                  onClick={goNext}
                  disabled={!canProceed || (stepIndex === 0 && scheduleBlocked)}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void onSubmit()}
                  disabled={submitting || !canProceed || scheduleBlocked}
                >
                  {submitting ? "Processing…" : "Confirm & pay"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit border-primary/20 lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle className="text-base">Your estimate</CardTitle>
          <CardDescription>{offer.serviceName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {offer.messageToCustomer && (
            <p className="rounded-xl bg-secondary/40 px-3 py-2 text-muted-foreground">
              {offer.messageToCustomer}
            </p>
          )}
          <ul className="space-y-2">
            <li className="flex justify-between gap-3">
              <span>{offer.serviceName}</span>
              <span className="tabular-nums">
                {formatCurrency(offer.breakdown.servicePriceCents)}
              </span>
            </li>
            {offer.breakdown.lines.map((line, index) => (
              <li key={`${line.name}-${index}`} className="flex justify-between gap-3">
                <span>{line.name}</span>
                <span className="tabular-nums">{formatCurrency(line.priceCents)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 border-t border-border pt-2 font-semibold text-brand-navy">
              <span>Total due</span>
              <span className="tabular-nums">{formatCurrency(offer.totalAmount)}</span>
            </li>
          </ul>
        </CardContent>
      </Card>
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
