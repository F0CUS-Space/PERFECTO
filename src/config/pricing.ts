import type { Frequency } from "@prisma/client";

/** Tunable pricing knobs — adjust without touching calculation logic. */
export const PRICING_CONFIG = {
  /** Fee per bedroom beyond the first included in base price. */
  bedroomFeeCents: 1500,
  /** Fee per bathroom beyond the first included in base price. */
  bathroomFeeCents: 1000,
  /** Square footage included in base before overage fees apply. */
  sqftIncluded: 1200,
  /** Cents charged per 100 sq ft above sqftIncluded. */
  sqftFeePer100Cents: 400,
  /** Flat surcharge when pets are present. */
  petFeeCents: 2000,
  /** Recurring visit discounts applied to (base + modifiers + add-ons). */
  frequencyDiscountPercent: {
    ONE_TIME: 0,
    WEEKLY: 0.15,
    BIWEEKLY: 0.1,
    MONTHLY: 0.05,
  } satisfies Record<Frequency, number>,
  /** Full amount collected at booking. */
  depositPercent: 1,
  /** Office-specific sizing fees (first N included in base). */
  office: {
    workstationsIncluded: 5,
    workstationFeeCents: 800,
    restroomsIncluded: 1,
    restroomFeeCents: 1200,
  },
  /** Move in/out furnished surcharges. */
  move: {
    partiallyFurnishedFeeCents: 2500,
    fullyFurnishedFeeCents: 4500,
  },
} as const;

export const FREQUENCY_OPTIONS: { value: Frequency; label: string; hint?: string }[] = [
  { value: "ONE_TIME", label: "One-time" },
  { value: "WEEKLY", label: "Weekly", hint: "Save 15%" },
  { value: "BIWEEKLY", label: "Biweekly", hint: "Save 10%" },
  { value: "MONTHLY", label: "Monthly", hint: "Save 5%" },
];
