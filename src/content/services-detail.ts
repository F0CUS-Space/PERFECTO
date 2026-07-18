// Accent gradients and local image fallbacks keyed by service slug.
// Canonical name, description, includes, and idealFor come from the DB.
// Public pages never show catalog prices — staff estimates set customer amounts.

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
  "government-municipal": {
    longDescription:
      "Reliable facility cleaning for city halls, courts, libraries, and public-safety buildings. We support after-hours schedules, high-traffic lobbies, and the appearance standards visitors and staff expect.",
    includes: [
      "Nightly or weekly cleaning of lobbies, offices, and common areas",
      "Restroom sanitization and restocking",
      "Floor care for high-traffic corridors",
      "Disinfection of high-touch surfaces",
      "Periodic deep cleaning of public spaces",
    ],
    idealFor: ["City halls and municipal offices", "Courts and libraries", "Police and fire stations"],
    accent: "from-brand-navy/15 to-brand-blue/15",
    image: "/images/services/government-municipal.webp",
  },
  "schools-daycares": {
    longDescription:
      "Campus and childcare cleaning built around student and staff safety. From classrooms to cafeterias and play areas, we keep learning environments fresh with scheduled cleaning, disinfection, and periodic deep cleans.",
    includes: [
      "Classroom, hallway, and common-area cleaning",
      "Restroom sanitization sized for school traffic",
      "Cafeteria and break-area surface care",
      "Disinfection of high-touch fixtures and furniture",
      "Scheduled deep cleans between terms or peak seasons",
    ],
    idealFor: ["Public and private K–12 schools", "Montessori programs", "Childcare and daycare centers"],
    accent: "from-brand-green/15 to-brand-mint/20",
    image: "/images/services/schools-daycares.webp",
  },
  "offices": {
    longDescription:
      "Professional office and co-working cleaning that keeps workspaces presentable for clients and healthier for teams. Nightly or weekly programs with disinfection and optional deep cleans on a cadence that fits your building.",
    includes: [
      "Workstations, meeting rooms, and common areas",
      "Kitchen and break-room cleaning",
      "Restroom sanitization and restocking",
      "Trash and recycling removal",
      "Disinfection of high-touch surfaces",
    ],
    idealFor: ["Professional offices", "Admin buildings", "Co-working spaces"],
    accent: "from-brand-blue/15 to-brand-navy/15",
    image: "/images/services/offices.webp",
  },
  "medical-dental": {
    longDescription:
      "Cleaning for small medical and dental practices and outpatient clinics where presentation and hygiene matter. We focus on waiting rooms, treatment-adjacent areas, and high-touch surfaces with disinfection-forward routines.",
    includes: [
      "Waiting room and reception cleaning",
      "Restroom sanitization",
      "Disinfection of high-touch surfaces",
      "Floor care suited to clinical foot traffic",
      "Periodic deep cleaning between peak days",
    ],
    idealFor: ["Dental and medical offices", "Outpatient clinics", "Specialty practices"],
    accent: "from-brand-mint/20 to-brand-blue/15",
    image: "/images/services/medical-dental.webp",
  },
  "restaurants-nightlife": {
    longDescription:
      "After-hours cleaning for restaurants, cafes, and nightclubs — kitchens-adjacent fronts of house, dining rooms, bars, and guest restrooms. Nightly resets, disinfection, and periodic deep cleans keep venues guest-ready.",
    includes: [
      "Dining room, bar, and lounge cleaning",
      "Restroom sanitization after peak service",
      "Floor care for high-traffic guest areas",
      "Disinfection of high-touch surfaces",
      "Periodic deep cleaning between busy seasons",
    ],
    idealFor: ["Restaurants and cafes", "Bars and nightclubs", "Hospitality venues"],
    accent: "from-brand-green/15 to-brand-navy/15",
    image: "/images/services/restaurants-nightlife.webp",
  },
};

export const defaultServiceDetail: ServiceDetail = {
  longDescription:
    "Professional commercial and facility cleaning delivered with meticulous care by our vetted team. Request an estimate tailored to your building.",
  includes: [
    "Vetted, trained professionals",
    "Nightly or weekly cleaning programs",
    "Disinfection and periodic deep cleaning",
  ],
  idealFor: ["Commercial and institutional facilities"],
  accent: "from-brand-blue/15 to-brand-green/15",
  image: "/images/services/offices.webp",
};
