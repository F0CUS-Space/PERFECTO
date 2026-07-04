import { z } from "zod";

import {
  getServiceQuoteProfile,
  type FurnishedStatus,
  type ServiceQuoteProfile,
} from "@/config/service-quote-profiles";

export const frequencySchema = z.enum(["ONE_TIME", "WEEKLY", "BIWEEKLY", "MONTHLY"]);

export const furnishedSchema = z.enum(["empty", "partially", "fully"]);

const optionalPropertySize = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? undefined : n;
  },
  z.number().int().min(200, "Minimum 200 sq ft").max(20000).optional(),
);

const requiredPropertySize = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? undefined : n;
  },
  z
    .number({ required_error: "Square footage is required" })
    .int()
    .min(200, "Minimum 200 sq ft")
    .max(20000),
);

/** Builds a Zod schema with only the fields relevant to the selected service. */
export function buildQuoteSchema(profile: ServiceQuoteProfile) {
  const shape: Record<string, z.ZodTypeAny> = {
    serviceId: z.string().min(1, "Select a service"),
    addOnIds: z.array(z.string()).default([]),
    clientTotalCents: z.number().int().optional(),
    promotionId: z.string().optional(),
  };

  if (profile.showBedrooms) {
    shape.bedrooms = z.coerce.number().int().min(1, "At least 1 bedroom").max(10);
  }

  if (profile.showBathrooms) {
    const bathroomLabel = profile.pricingMode === "office" ? "restroom" : "bathroom";
    shape.bathrooms = z.coerce
      .number()
      .int()
      .min(1, `At least 1 ${bathroomLabel}`)
      .max(profile.pricingMode === "office" ? 30 : 10);
  }

  if (profile.showWorkstations) {
    shape.workstations = z.coerce
      .number()
      .int()
      .min(1, "At least 1 workstation")
      .max(500, "Maximum 500 workstations");
  }

  if (profile.showPropertySize === "required") {
    shape.propertySize = requiredPropertySize;
  } else if (profile.showPropertySize === "optional") {
    shape.propertySize = optionalPropertySize;
  }

  if (profile.showPets) {
    shape.hasPets = z.boolean().default(false);
  }

  if (profile.showFurnished) {
    shape.furnished = furnishedSchema;
  }

  if (profile.showFrequency) {
    shape.frequency = frequencySchema.default(profile.defaultFrequency);
  } else {
    shape.frequency = z.literal(profile.defaultFrequency);
  }

  return z.object(shape);
}

export type QuoteFormValues = {
  serviceId: string;
  bedrooms?: number;
  bathrooms?: number;
  workstations?: number;
  propertySize?: number;
  hasPets?: boolean;
  furnished?: FurnishedStatus;
  frequency: z.infer<typeof frequencySchema>;
  addOnIds: string[];
  clientTotalCents?: number;
  promotionId?: string;
};

/** Validates quote input for a known service slug (server-side). */
export function parseQuoteInput(raw: unknown, serviceSlug: string): QuoteFormValues {
  const profile = getServiceQuoteProfile(serviceSlug);
  return buildQuoteSchema(profile).parse(raw) as QuoteFormValues;
}

export type QuoteFrequency = z.infer<typeof frequencySchema>;
