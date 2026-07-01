import type { Frequency } from "@prisma/client";

import type { FurnishedStatus, PricingMode } from "@/config/service-quote-profiles";
import { PRICING_CONFIG } from "@/config/pricing";

export interface QuoteAddOnInput {
  id: string;
  name: string;
  priceCents: number;
}

export interface CalculateQuoteInput {
  pricingMode: PricingMode;
  serviceBasePriceCents: number;
  serviceName: string;
  bedrooms?: number;
  bathrooms?: number;
  workstations?: number;
  propertySize?: number;
  furnished?: FurnishedStatus;
  hasPets?: boolean;
  frequency: Frequency;
  addOns: QuoteAddOnInput[];
  /** Per-service sq ft included in base (overrides global default). */
  sqftIncluded?: number;
}

export interface QuoteSummaryItem {
  label: string;
  value: string;
}

export interface QuoteBreakdownLine {
  label: string;
  amountCents: number;
}

export interface QuoteCalculation {
  lines: QuoteBreakdownLine[];
  subtotalCents: number;
  addOnsTotalCents: number;
  frequencyDiscountCents: number;
  estimatedTotalCents: number;
  depositCents: number;
  balanceCents: number;
  summary: QuoteSummaryItem[];
  breakdown: {
    pricingMode: PricingMode;
    serviceBasePriceCents: number;
    bedroomFeeCents: number;
    bathroomFeeCents: number;
    workstationFeeCents: number;
    sqftFeeCents: number;
    petFeeCents: number;
    furnishedFeeCents: number;
    frequency: Frequency;
    frequencyDiscountPercent: number;
    serviceDetails?: {
      bedrooms?: number;
      bathrooms?: number;
      workstations?: number;
      propertySize?: number;
      furnished?: FurnishedStatus;
      hasPets?: boolean;
    };
  };
}

/**
 * Deterministic quote engine — used on client (instant UI) and server (authoritative).
 * All amounts in cents.
 */
export function calculateQuote(input: CalculateQuoteInput): QuoteCalculation {
  const {
    pricingMode,
    serviceBasePriceCents,
    serviceName,
    bedrooms = 0,
    bathrooms = 0,
    workstations = 0,
    propertySize,
    furnished,
    hasPets = false,
    frequency,
    addOns,
    sqftIncluded = PRICING_CONFIG.sqftIncluded,
  } = input;

  const lines: QuoteBreakdownLine[] = [
    { label: `${serviceName} base`, amountCents: serviceBasePriceCents },
  ];

  let bedroomFeeCents = 0;
  let bathroomFeeCents = 0;
  let workstationFeeCents = 0;
  let sqftFeeCents = 0;
  let petFeeCents = 0;
  let furnishedFeeCents = 0;
  const summary: QuoteSummaryItem[] = [{ label: "Service", value: serviceName }];

  if (pricingMode === "office") {
    const extraWorkstations = Math.max(0, workstations - PRICING_CONFIG.office.workstationsIncluded);
    workstationFeeCents = extraWorkstations * PRICING_CONFIG.office.workstationFeeCents;

    const extraRestrooms = Math.max(0, bathrooms - PRICING_CONFIG.office.restroomsIncluded);
    bathroomFeeCents = extraRestrooms * PRICING_CONFIG.office.restroomFeeCents;

    if (workstationFeeCents > 0) {
      lines.push({
        label: `Extra workstations (${extraWorkstations})`,
        amountCents: workstationFeeCents,
      });
    }
    if (bathroomFeeCents > 0) {
      lines.push({
        label: `Extra restrooms (${extraRestrooms})`,
        amountCents: bathroomFeeCents,
      });
    }

    summary.push(
      { label: "Workstations", value: String(workstations) },
      { label: "Restrooms", value: String(bathrooms) },
    );
  } else {
    const extraBedrooms = Math.max(0, bedrooms - 1);
    const extraBathrooms = Math.max(0, bathrooms - 1);
    bedroomFeeCents = extraBedrooms * PRICING_CONFIG.bedroomFeeCents;
    bathroomFeeCents = extraBathrooms * PRICING_CONFIG.bathroomFeeCents;

    if (bedroomFeeCents > 0) {
      lines.push({
        label: `Extra bedrooms (${extraBedrooms})`,
        amountCents: bedroomFeeCents,
      });
    }
    if (bathroomFeeCents > 0) {
      lines.push({
        label: `Extra bathrooms (${extraBathrooms})`,
        amountCents: bathroomFeeCents,
      });
    }

    summary.push(
      { label: "Bedrooms", value: String(bedrooms) },
      { label: "Bathrooms", value: String(bathrooms) },
    );
  }

  if (propertySize && propertySize > sqftIncluded) {
    const overage = propertySize - sqftIncluded;
    sqftFeeCents = Math.ceil(overage / 100) * PRICING_CONFIG.sqftFeePer100Cents;
    lines.push({
      label: `Square footage over ${sqftIncluded.toLocaleString()} sq ft`,
      amountCents: sqftFeeCents,
    });
  }

  if (propertySize) {
    summary.push({ label: "Square footage", value: `${propertySize.toLocaleString()} sq ft` });
  }

  if (pricingMode === "move" && furnished) {
    if (furnished === "partially") {
      furnishedFeeCents = PRICING_CONFIG.move.partiallyFurnishedFeeCents;
      lines.push({ label: "Partially furnished", amountCents: furnishedFeeCents });
    } else if (furnished === "fully") {
      furnishedFeeCents = PRICING_CONFIG.move.fullyFurnishedFeeCents;
      lines.push({ label: "Fully furnished", amountCents: furnishedFeeCents });
    }
    const furnishedLabel =
      furnished === "empty" ? "Empty" : furnished === "partially" ? "Partially furnished" : "Fully furnished";
    summary.push({ label: "Condition", value: furnishedLabel });
  }

  if (hasPets && pricingMode !== "office") {
    petFeeCents = PRICING_CONFIG.petFeeCents;
    lines.push({ label: "Pet-friendly cleaning", amountCents: petFeeCents });
    summary.push({ label: "Pets", value: "Yes" });
  } else if (pricingMode !== "office" && pricingMode !== "move") {
    summary.push({ label: "Pets", value: hasPets ? "Yes" : "No" });
  }

  const subtotalCents =
    serviceBasePriceCents +
    bedroomFeeCents +
    bathroomFeeCents +
    workstationFeeCents +
    sqftFeeCents +
    petFeeCents +
    furnishedFeeCents;

  const addOnsTotalCents = addOns.reduce((sum, a) => sum + a.priceCents, 0);
  for (const addOn of addOns) {
    lines.push({ label: addOn.name, amountCents: addOn.priceCents });
  }

  const beforeDiscountCents = subtotalCents + addOnsTotalCents;
  const discountPercent = PRICING_CONFIG.frequencyDiscountPercent[frequency];
  const frequencyDiscountCents = Math.round(beforeDiscountCents * discountPercent);

  if (frequencyDiscountCents > 0) {
    lines.push({
      label: `${frequency.replace("_", " ").toLowerCase()} discount (${Math.round(discountPercent * 100)}%)`,
      amountCents: -frequencyDiscountCents,
    });
  }

  const frequencyLabels: Record<Frequency, string> = {
    ONE_TIME: "One-time",
    WEEKLY: "Weekly",
    BIWEEKLY: "Biweekly",
    MONTHLY: "Monthly",
  };
  summary.push({ label: "Frequency", value: frequencyLabels[frequency] });

  const estimatedTotalCents = beforeDiscountCents - frequencyDiscountCents;
  const depositCents = Math.round(estimatedTotalCents * PRICING_CONFIG.depositPercent);
  const balanceCents = estimatedTotalCents - depositCents;

  return {
    lines,
    subtotalCents,
    addOnsTotalCents,
    frequencyDiscountCents,
    estimatedTotalCents,
    depositCents,
    balanceCents,
    summary,
    breakdown: {
      pricingMode,
      serviceBasePriceCents,
      bedroomFeeCents,
      bathroomFeeCents,
      workstationFeeCents,
      sqftFeeCents,
      petFeeCents,
      furnishedFeeCents,
      frequency,
      frequencyDiscountPercent: discountPercent,
      serviceDetails: {
        bedrooms: bedrooms || undefined,
        bathrooms: bathrooms || undefined,
        workstations: workstations || undefined,
        propertySize,
        furnished,
        hasPets: hasPets || undefined,
      },
    },
  };
}
