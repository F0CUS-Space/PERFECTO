"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FREQUENCY_OPTIONS } from "@/config/pricing";
import {
  FURNISHED_OPTIONS,
  getProfileDefaultValues,
  getServiceQuoteProfile,
} from "@/config/service-quote-profiles";
import { Badge } from "@/components/ui/badge";
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
import { cn, formatCurrency } from "@/lib/utils";

import { saveQuote } from "./actions";
import type { QuoteCatalogService } from "./queries";
import type { ClaimablePromotion } from "@/features/promotions/queries";
import { promotionAppliesToService } from "@/features/promotions/services/promotion-discount";
import { buildQuoteSchema, type QuoteFormValues } from "./schema";
import { calculateQuote } from "./services/pricing";
import { useQuoteStore } from "./store";

const selectClassName =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

interface QuoteCalculatorProps {
  catalog: QuoteCatalogService[];
  /** When true, stays on /book instead of navigating away after save. */
  embedded?: boolean;
  /** Promotion claimed from the promotions page. */
  claimPromotion?: ClaimablePromotion | null;
}

export function QuoteCalculator({ catalog, embedded, claimPromotion }: QuoteCalculatorProps) {
  const initialServiceId =
    claimPromotion && claimPromotion.serviceIds.length > 0
      ? catalog.find((service) => claimPromotion.serviceIds.includes(service.id))?.id ??
        catalog[0]?.id ??
        ""
      : catalog[0]?.id ?? "";

  const [selectedServiceId, setSelectedServiceId] = useState(initialServiceId);
  const selectedService = catalog.find((s) => s.id === selectedServiceId);

  if (catalog.length === 0) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <CardHeader>
          <CardTitle>Pricing unavailable</CardTitle>
          <CardDescription>
            Our service catalog is not loaded yet. Start the database and run{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">npm run db:seed</code>, then
            refresh this page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/services">Browse services</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Which service do you need?</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            id="serviceId"
            className={selectClassName}
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
          >
            {catalog.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
                {service.isPopular ? " ★" : ""}
              </option>
            ))}
          </select>
          {selectedService && (
            <p className="mt-2 text-sm text-muted-foreground">{selectedService.description}</p>
          )}
        </CardContent>
      </Card>

      {selectedService && (
        <QuoteServiceForm
          key={selectedService.slug}
          service={selectedService}
          embedded={embedded}
          claimPromotion={claimPromotion}
        />
      )}
    </div>
  );
}

function QuoteServiceForm({
  service,
  embedded,
  claimPromotion,
}: {
  service: QuoteCatalogService;
  embedded?: boolean;
  claimPromotion?: ClaimablePromotion | null;
}) {
  const router = useRouter();
  const setDraft = useQuoteStore((s) => s.setDraft);
  const profile = getServiceQuoteProfile(service.slug);
  const schema = useMemo(() => buildQuoteSchema(profile), [profile]);

  const promotionApplies = claimPromotion
    ? promotionAppliesToService(claimPromotion.serviceIds, service.id)
    : false;
  const activePromotion = promotionApplies ? claimPromotion : null;

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: getProfileDefaultValues(profile, service.id),
    mode: "onChange",
  });

  const watched = form.watch();

  const visibleFrequencies = FREQUENCY_OPTIONS.filter((option) =>
    profile.frequencyOptions.includes(option.value),
  );

  const calculation = useMemo(() => {
    const selectedAddOns = service.addOns
      .filter((a) => watched.addOnIds.includes(a.id))
      .map((a) => ({ id: a.id, name: a.name, priceCents: a.price }));

    return calculateQuote({
      pricingMode: profile.pricingMode,
      serviceBasePriceCents: service.basePrice,
      serviceName: service.name,
      bedrooms: watched.bedrooms,
      bathrooms: watched.bathrooms,
      workstations: watched.workstations,
      propertySize: watched.propertySize,
      furnished: watched.furnished,
      hasPets: watched.hasPets,
      frequency: watched.frequency,
      addOns: selectedAddOns,
      sqftIncluded: profile.sqftIncluded,
      promotion: activePromotion
        ? {
            title: activePromotion.title,
            discountType: activePromotion.discountType,
            discountValue: activePromotion.discountValue,
          }
        : undefined,
    });
  }, [service, profile, watched, activePromotion]);

  const toggleAddOn = (addOnId: string) => {
    const current = form.getValues("addOnIds");
    const next = current.includes(addOnId)
      ? current.filter((id) => id !== addOnId)
      : [...current, addOnId];
    form.setValue("addOnIds", next, { shouldValidate: true });
  };

  const onContinue = form.handleSubmit(async (values) => {
    setSubmitError(null);
    setIsSubmitting(true);

    const result = await saveQuote({
      ...values,
      clientTotalCents: calculation.estimatedTotalCents,
      promotionId: activePromotion?.id,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    setDraft({
      quoteId: result.quoteId,
      serviceId: values.serviceId,
      serviceSlug: result.serviceSlug,
      serviceName: result.serviceName,
      bedrooms: values.bedrooms,
      bathrooms: values.bathrooms,
      workstations: values.workstations,
      propertySize: values.propertySize,
      hasPets: values.hasPets,
      furnished: values.furnished,
      frequency: values.frequency,
      addOnIds: values.addOnIds,
      calculation: result.calculation,
      promotionId: activePromotion?.id,
      promotionTitle: result.calculation.promotionTitle,
    });

    if (embedded) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    router.push("/book");
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <Card>
        <CardHeader>
          <CardTitle>{profile.formTitle}</CardTitle>
          <CardDescription>{profile.formDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {claimPromotion && (
            <div
              className={
                activePromotion
                  ? "rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm"
                  : "rounded-xl border border-dashed border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              }
            >
              {activePromotion ? (
                <>
                  <p className="font-medium text-brand-navy">
                    Promotion applied: {activePromotion.title}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {activePromotion.discountLabel} will be deducted from your total.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">Promotion not available for this service</p>
                  <p className="mt-1">
                    {claimPromotion.appliesToAllServices
                      ? "This promotion is no longer active."
                      : `Select one of: ${claimPromotion.serviceNames.join(", ")}.`}
                  </p>
                </>
              )}
            </div>
          )}

          {(profile.showBedrooms || profile.showBathrooms) && (
            <div
              className={cn(
                "grid gap-4",
                profile.showBedrooms && profile.showBathrooms ? "sm:grid-cols-2" : "max-w-xs",
              )}
            >
              {profile.showBedrooms && (
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">{profile.labels.bedrooms}</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min={1}
                    max={10}
                    {...form.register("bedrooms", { valueAsNumber: true })}
                  />
                  {form.formState.errors.bedrooms && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.bedrooms.message}
                    </p>
                  )}
                </div>
              )}
              {profile.showBathrooms && (
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">{profile.labels.bathrooms}</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min={1}
                    max={profile.pricingMode === "office" ? 30 : 10}
                    {...form.register("bathrooms", { valueAsNumber: true })}
                  />
                  {form.formState.errors.bathrooms && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.bathrooms.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {profile.showWorkstations && (
            <div className="max-w-xs space-y-2">
              <Label htmlFor="workstations">{profile.labels.workstations}</Label>
              <Input
                id="workstations"
                type="number"
                min={1}
                max={500}
                {...form.register("workstations", { valueAsNumber: true })}
              />
              {form.formState.errors.workstations && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.workstations.message}
                </p>
              )}
            </div>
          )}

          {profile.showPropertySize !== "hidden" && (
            <div className="max-w-xs space-y-2">
              <Label htmlFor="propertySize">
                {profile.labels.propertySize}{" "}
                {profile.showPropertySize === "optional" && (
                  <span className="font-normal text-muted-foreground">(optional)</span>
                )}
              </Label>
              <Input
                id="propertySize"
                type="number"
                min={200}
                max={20000}
                placeholder={profile.pricingMode === "office" ? "e.g. 3500" : "e.g. 1500"}
                {...form.register("propertySize", {
                  setValueAs: (v) => (v === "" || v === null ? undefined : Number(v)),
                })}
              />
              {form.formState.errors.propertySize && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.propertySize.message}
                </p>
              )}
            </div>
          )}

          {profile.showFurnished && (
            <div className="space-y-3">
              <Label>{profile.labels.furnished}</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {FURNISHED_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer flex-col rounded-xl border px-4 py-3 transition-colors",
                      watched.furnished === option.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:bg-secondary/40",
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="radio"
                        name="furnished"
                        className="accent-primary"
                        checked={watched.furnished === option.value}
                        onChange={() =>
                          form.setValue("furnished", option.value, { shouldValidate: true })
                        }
                      />
                      {option.label}
                    </span>
                    {option.hint && (
                      <span className="mt-1 pl-6 text-xs text-muted-foreground">{option.hint}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {profile.showPets && (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={watched.hasPets ?? false}
                onChange={(e) =>
                  form.setValue("hasPets", e.target.checked, { shouldValidate: true })
                }
              />
              <span className="text-sm font-medium text-brand-navy">{profile.labels.pets}</span>
            </label>
          )}

          {profile.showFrequency && visibleFrequencies.length > 0 && (
            <div className="space-y-3">
              <Label>How often should we clean?</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {visibleFrequencies.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-colors",
                      watched.frequency === option.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:bg-secondary/40",
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="radio"
                        name="frequency"
                        className="accent-primary"
                        checked={watched.frequency === option.value}
                        onChange={() =>
                          form.setValue("frequency", option.value, { shouldValidate: true })
                        }
                      />
                      {option.label}
                    </span>
                    {option.hint && (
                      <Badge variant="secondary" className="text-xs">
                        {option.hint}
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {service.addOns.length > 0 && (
            <div className="space-y-3">
              <Label>Add-ons</Label>
              <div className="space-y-2">
                {service.addOns.map((addOn) => {
                  const checked = watched.addOnIds.includes(addOn.id);
                  return (
                    <label
                      key={addOn.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-colors",
                        checked
                          ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                          : "border-border hover:bg-secondary/40",
                      )}
                    >
                      <span className="flex items-center gap-3 text-sm font-medium">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input accent-accent"
                          checked={checked}
                          onChange={() => toggleAddOn(addOn.id)}
                        />
                        {addOn.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        +{formatCurrency(addOn.price)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="lg:sticky lg:top-24">
        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="bg-gradient-to-br from-primary/10 via-transparent to-accent/10">
            <CardTitle>Your price</CardTitle>
            <CardDescription>Transparent pricing — what you see is what you pay at booking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <ul className="space-y-2 text-sm">
              {calculation.lines.map((line) => (
                <li key={line.label} className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">{line.label}</span>
                  <span
                    className={cn(
                      "shrink-0 font-medium tabular-nums",
                      line.amountCents < 0 ? "text-accent" : "text-brand-navy",
                    )}
                  >
                    {line.amountCents < 0 ? "−" : ""}
                    {formatCurrency(Math.abs(line.amountCents))}
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-t border-border pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-base font-semibold text-brand-navy">Estimated total</span>
                <span className="text-2xl font-bold tabular-nums text-primary">
                  {formatCurrency(calculation.estimatedTotalCents)}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Full payment of {formatCurrency(calculation.estimatedTotalCents)} is due when you
                confirm your booking.
              </p>
            </div>

            {submitError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </p>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={onContinue}
              disabled={isSubmitting || !form.formState.isValid}
            >
              {isSubmitting ? "Saving…" : "Continue"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
