import type { Frequency } from "@prisma/client";

export type PricingMode = "residential" | "office" | "move";

export type FurnishedStatus = "empty" | "partially" | "fully";

export interface ServiceQuoteProfile {
  slug: string;
  formTitle: string;
  formDescription: string;
  pricingMode: PricingMode;
  showBedrooms: boolean;
  showBathrooms: boolean;
  showWorkstations: boolean;
  showPropertySize: "hidden" | "optional" | "required";
  showPets: boolean;
  showFurnished: boolean;
  showFrequency: boolean;
  frequencyOptions: Frequency[];
  defaultFrequency: Frequency;
  labels: {
    bedrooms: string;
    bathrooms: string;
    propertySize: string;
    workstations: string;
    pets: string;
    furnished: string;
  };
  defaults: {
    bedrooms: number;
    bathrooms: number;
    workstations: number;
    hasPets: boolean;
    furnished: FurnishedStatus;
  };
  /** Override sq ft included in base for this service type. */
  sqftIncluded?: number;
}

export const FURNISHED_OPTIONS: { value: FurnishedStatus; label: string; hint?: string }[] = [
  { value: "empty", label: "Empty", hint: "No furniture" },
  { value: "partially", label: "Partially furnished" },
  { value: "fully", label: "Fully furnished", hint: "More detail work" },
];

const ALL_FREQUENCIES: Frequency[] = ["ONE_TIME", "WEEKLY", "BIWEEKLY", "MONTHLY"];
const RECURRING_FREQUENCIES: Frequency[] = ["WEEKLY", "BIWEEKLY", "MONTHLY"];

export const SERVICE_QUOTE_PROFILES: Record<string, ServiceQuoteProfile> = {
  "residential-cleaning": {
    slug: "residential-cleaning",
    formTitle: "Tell us about your home",
    formDescription:
      "Bedrooms and bathrooms help us size the crew. Square footage refines the estimate if your home is larger than average.",
    pricingMode: "residential",
    showBedrooms: true,
    showBathrooms: true,
    showWorkstations: false,
    showPropertySize: "optional",
    showPets: true,
    showFurnished: false,
    showFrequency: true,
    frequencyOptions: ALL_FREQUENCIES,
    defaultFrequency: "ONE_TIME",
    labels: {
      bedrooms: "Bedrooms",
      bathrooms: "Bathrooms",
      propertySize: "Square footage",
      workstations: "Workstations",
      pets: "We have pets at home",
      furnished: "Property condition",
    },
    defaults: { bedrooms: 2, bathrooms: 2, workstations: 5, hasPets: false, furnished: "fully" },
  },
  "deep-cleaning": {
    slug: "deep-cleaning",
    formTitle: "Tell us about the deep clean scope",
    formDescription:
      "Deep cleans depend on home size and layout. Square footage is required so we can plan the right team and time on site.",
    pricingMode: "residential",
    showBedrooms: true,
    showBathrooms: true,
    showWorkstations: false,
    showPropertySize: "required",
    showPets: true,
    showFurnished: false,
    showFrequency: false,
    frequencyOptions: ["ONE_TIME"],
    defaultFrequency: "ONE_TIME",
    sqftIncluded: 1500,
    labels: {
      bedrooms: "Bedrooms",
      bathrooms: "Bathrooms",
      propertySize: "Square footage",
      workstations: "Workstations",
      pets: "Pets live in this home",
      furnished: "Property condition",
    },
    defaults: { bedrooms: 2, bathrooms: 2, workstations: 5, hasPets: false, furnished: "fully" },
  },
  "move-in-out": {
    slug: "move-in-out",
    formTitle: "Tell us about the property",
    formDescription:
      "Move cleans vary by layout and whether the space is empty or furnished. Let us know what we're walking into.",
    pricingMode: "move",
    showBedrooms: true,
    showBathrooms: true,
    showWorkstations: false,
    showPropertySize: "optional",
    showPets: false,
    showFurnished: true,
    showFrequency: false,
    frequencyOptions: ["ONE_TIME"],
    defaultFrequency: "ONE_TIME",
    labels: {
      bedrooms: "Bedrooms",
      bathrooms: "Bathrooms",
      propertySize: "Square footage",
      workstations: "Workstations",
      pets: "Pets",
      furnished: "Is the property empty or furnished?",
    },
    defaults: { bedrooms: 2, bathrooms: 2, workstations: 5, hasPets: false, furnished: "empty" },
  },
  "office-cleaning": {
    slug: "office-cleaning",
    formTitle: "Tell us about your workspace",
    formDescription:
      "Offices are sized by square footage, workstations, and restrooms — not bedrooms. Share those details for an accurate quote.",
    pricingMode: "office",
    showBedrooms: false,
    showBathrooms: true,
    showWorkstations: true,
    showPropertySize: "required",
    showPets: false,
    showFurnished: false,
    showFrequency: true,
    frequencyOptions: RECURRING_FREQUENCIES,
    defaultFrequency: "WEEKLY",
    sqftIncluded: 2000,
    labels: {
      bedrooms: "Bedrooms",
      bathrooms: "Restrooms",
      propertySize: "Office square footage",
      workstations: "Workstations / desks",
      pets: "Pets",
      furnished: "Property condition",
    },
    defaults: { bedrooms: 0, bathrooms: 2, workstations: 8, hasPets: false, furnished: "fully" },
  },
  "recurring-cleaning": {
    slug: "recurring-cleaning",
    formTitle: "Tell us about your home",
    formDescription:
      "Recurring service is priced by home size and visit frequency. Pick how often you'd like us back.",
    pricingMode: "residential",
    showBedrooms: true,
    showBathrooms: true,
    showWorkstations: false,
    showPropertySize: "optional",
    showPets: true,
    showFurnished: false,
    showFrequency: true,
    frequencyOptions: RECURRING_FREQUENCIES,
    defaultFrequency: "BIWEEKLY",
    labels: {
      bedrooms: "Bedrooms",
      bathrooms: "Bathrooms",
      propertySize: "Square footage",
      workstations: "Workstations",
      pets: "We have pets at home",
      furnished: "Property condition",
    },
    defaults: { bedrooms: 2, bathrooms: 2, workstations: 5, hasPets: false, furnished: "fully" },
  },
};

const FALLBACK_PROFILE = SERVICE_QUOTE_PROFILES["residential-cleaning"];

export function getServiceQuoteProfile(slug: string): ServiceQuoteProfile {
  return SERVICE_QUOTE_PROFILES[slug] ?? FALLBACK_PROFILE;
}

export function getProfileDefaultValues(
  profile: ServiceQuoteProfile,
  serviceId: string,
): {
  serviceId: string;
  bedrooms: number;
  bathrooms: number;
  workstations: number;
  propertySize?: number;
  hasPets: boolean;
  furnished: FurnishedStatus;
  frequency: Frequency;
  addOnIds: string[];
} {
  return {
    serviceId,
    bedrooms: profile.defaults.bedrooms,
    bathrooms: profile.defaults.bathrooms,
    workstations: profile.defaults.workstations,
    propertySize: undefined,
    hasPets: profile.defaults.hasPets,
    furnished: profile.defaults.furnished,
    frequency: profile.defaultFrequency,
    addOnIds: [],
  };
}
