// Rich marketing detail for each service, keyed by slug. The canonical name,
// price, and short description come from the database (admin-managed); this map
// supplies the longer-form content shown on individual service pages.

export interface ServiceDetail {
  longDescription: string;
  includes: string[];
  idealFor: string[];
  // Tailwind gradient classes used behind the photo as a tasteful brand tint.
  accent: string;
  // Marketing photo for the service (lives in /public/images).
  image: string;
}

export const serviceDetails: Record<string, ServiceDetail> = {
  "residential-cleaning": {
    longDescription:
      "Our signature residential service keeps your home consistently spotless. A dedicated, vetted professional handles every room with meticulous attention, so you can come home to a fresh, healthy space — every single time.",
    includes: [
      "Dusting of all accessible surfaces",
      "Vacuuming and mopping of all floors",
      "Kitchen counters, sink, and exterior appliances",
      "Bathroom sanitization (toilet, shower, sink, mirrors)",
      "Trash removal and tidy-up",
    ],
    idealFor: ["Busy households", "Weekly or biweekly upkeep", "Allergy-conscious homes"],
    accent: "from-brand-blue/15 to-brand-green/15",
    image: "/images/service-residential.png",
  },
  "deep-cleaning": {
    longDescription:
      "An exhaustive, top-to-bottom restoration of your home. We reach the places routine cleaning misses — baseboards, grout, behind appliances, and inside fixtures — leaving every corner immaculate.",
    includes: [
      "Everything in a standard clean",
      "Baseboards, door frames, and vents",
      "Inside appliance and cabinet detailing (on request)",
      "Grout and tile scrubbing",
      "Detailed bathroom and kitchen degreasing",
    ],
    idealFor: ["First-time cleans", "Seasonal refreshes", "Pre-event preparation"],
    accent: "from-brand-navy/15 to-brand-blue/15",
    image: "/images/service-deep.png",
  },
  "move-in-out": {
    longDescription:
      "Moving is stressful enough. Our move in/out service delivers a comprehensive clean of an empty property so you can hand over the keys — or settle in — with total confidence.",
    includes: [
      "Full deep clean of every room",
      "Inside all cabinets and closets",
      "Inside oven, fridge, and appliances",
      "Window sills and tracks",
      "Wall spot-cleaning and fixtures",
    ],
    idealFor: ["Tenants and landlords", "New homeowners", "Realtors and property managers"],
    accent: "from-brand-green/15 to-brand-mint/20",
    image: "/images/service-move.png",
  },
  "office-cleaning": {
    longDescription:
      "A pristine workspace boosts focus, health, and first impressions. We tailor a cleaning plan to your office's schedule and footprint, keeping your team productive and your space presentable.",
    includes: [
      "Workstations and common areas",
      "Restroom sanitization and restocking",
      "Kitchen and break room cleaning",
      "Floor care across the office",
      "Trash and recycling removal",
    ],
    idealFor: ["Small and mid-size offices", "Co-working spaces", "Retail and clinics"],
    accent: "from-brand-blue/15 to-brand-navy/15",
    image: "/images/service-office.png",
  },
  "recurring-cleaning": {
    longDescription:
      "Set it and forget it. Our recurring plans keep your space consistently clean on a schedule that suits you, with the same trusted professional whenever possible and priority booking.",
    includes: [
      "Customizable weekly, biweekly, or monthly visits",
      "Consistent, vetted professional",
      "Priority scheduling",
      "Flexible add-ons each visit",
      "Satisfaction guarantee",
    ],
    idealFor: ["Long-term upkeep", "Families and professionals", "Best value per visit"],
    accent: "from-brand-mint/20 to-brand-green/15",
    image: "/images/service-recurring.png",
  },
};

export const defaultServiceDetail: ServiceDetail = {
  longDescription:
    "A professional cleaning service delivered with meticulous care by our vetted team. Get an instant quote to see transparent pricing tailored to your space.",
  includes: [
    "Vetted, trained professionals",
    "Premium, eco-friendly supplies",
    "100% satisfaction guarantee",
  ],
  idealFor: ["Homes and workspaces"],
  accent: "from-brand-blue/15 to-brand-green/15",
  image: "/images/service-residential.png",
};
