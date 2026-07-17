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

/** Shared commercial / facility profile (office-style sizing). */
function commercialFacilityProfile(
  slug: string,
  formTitle: string,
  formDescription: string,
  options?: {
    defaultFrequency?: Frequency;
    frequencyOptions?: Frequency[];
    showFrequency?: boolean;
    bathroomsLabel?: string;
    propertySizeLabel?: string;
    workstationsLabel?: string;
    workstationsDefault?: number;
    bathroomsDefault?: number;
    sqftIncluded?: number;
  },
): ServiceQuoteProfile {
  return {
    slug,
    formTitle,
    formDescription,
    pricingMode: "office",
    showBedrooms: false,
    showBathrooms: true,
    showWorkstations: true,
    showPropertySize: "required",
    showPets: false,
    showFurnished: false,
    showFrequency: options?.showFrequency ?? true,
    frequencyOptions: options?.frequencyOptions ?? RECURRING_FREQUENCIES,
    defaultFrequency: options?.defaultFrequency ?? "WEEKLY",
    sqftIncluded: options?.sqftIncluded ?? 2000,
    labels: {
      bedrooms: "Bedrooms",
      bathrooms: options?.bathroomsLabel ?? "Restrooms",
      propertySize: options?.propertySizeLabel ?? "Facility square footage",
      workstations: options?.workstationsLabel ?? "Workstations / desks",
      pets: "Pets",
      furnished: "Property condition",
    },
    defaults: {
      bedrooms: 0,
      bathrooms: options?.bathroomsDefault ?? 2,
      workstations: options?.workstationsDefault ?? 8,
      hasPets: false,
      furnished: "fully",
    },
  };
}

export const SERVICE_QUOTE_PROFILES: Record<string, ServiceQuoteProfile> = {
  // --- Active commercial catalog ---
  "government-municipal": commercialFacilityProfile(
    "government-municipal",
    "Tell us about the facility",
    "Municipal buildings are sized by square footage, restrooms, and occupied work areas — share those details for an estimate.",
    {
      propertySizeLabel: "Building square footage",
      workstationsLabel: "Offices / workstations",
      bathroomsDefault: 4,
      workstationsDefault: 20,
      sqftIncluded: 5000,
    },
  ),
  "schools-daycares": commercialFacilityProfile(
    "schools-daycares",
    "Tell us about the campus",
    "Schools and daycares are sized by square footage, restrooms, and classroom/work areas.",
    {
      propertySizeLabel: "Campus / building square footage",
      workstationsLabel: "Classrooms / rooms",
      bathroomsDefault: 6,
      workstationsDefault: 12,
      sqftIncluded: 8000,
    },
  ),
  offices: commercialFacilityProfile(
    "offices",
    "Tell us about your workspace",
    "Offices are sized by square footage, workstations, and restrooms. Share those details for an accurate quote.",
    {
      propertySizeLabel: "Office square footage",
      workstationsLabel: "Workstations / desks",
      bathroomsDefault: 2,
      workstationsDefault: 8,
      sqftIncluded: 2000,
    },
  ),
  "medical-dental": commercialFacilityProfile(
    "medical-dental",
    "Tell us about the practice",
    "Clinics are sized by square footage, treatment/work areas, and restrooms.",
    {
      propertySizeLabel: "Suite square footage",
      workstationsLabel: "Operatories / exam rooms",
      bathroomsDefault: 2,
      workstationsDefault: 4,
      sqftIncluded: 1500,
      frequencyOptions: ALL_FREQUENCIES,
      defaultFrequency: "WEEKLY",
    },
  ),
  "restaurants-nightlife": commercialFacilityProfile(
    "restaurants-nightlife",
    "Tell us about the venue",
    "Hospitality venues are sized by guest-area square footage, seating/work zones, and restrooms.",
    {
      propertySizeLabel: "Venue square footage",
      workstationsLabel: "Seating / service zones",
      bathroomsDefault: 2,
      workstationsDefault: 6,
      sqftIncluded: 2500,
      frequencyOptions: ["ONE_TIME", "WEEKLY", "BIWEEKLY", "MONTHLY"],
      defaultFrequency: "WEEKLY",
    },
  ),

  // --- Legacy profiles (kept so historical quotes / admin paths do not crash) ---
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
  "office-cleaning": commercialFacilityProfile(
    "office-cleaning",
    "Tell us about your workspace",
    "Offices are sized by square footage, workstations, and restrooms — not bedrooms. Share those details for an accurate quote.",
  ),
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

const FALLBACK_PROFILE = SERVICE_QUOTE_PROFILES.offices;

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
