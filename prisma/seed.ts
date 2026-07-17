import { PrismaClient, Role } from "@prisma/client";

import { serviceDetails } from "../src/content/services-detail";

const prisma = new PrismaClient();

/** Legacy catalog slugs — deactivate (do not hard-delete; bookings may reference them). */
const LEGACY_SERVICE_SLUGS = [
  "residential-cleaning",
  "deep-cleaning",
  "move-in-out",
  "office-cleaning",
  "recurring-cleaning",
] as const;

/** Legacy residential add-ons — deactivate in favor of commercial facility add-ons. */
const LEGACY_ADDON_NAMES = [
  "Inside Fridge",
  "Inside Oven",
  "Interior Windows",
  "Laundry & Folding",
  "Inside Cabinets",
] as const;

async function main() {
  console.log("Seeding Perfecto database...");

  // --- Admin user (login with +10000000000 / OTP 123123 in dev) ---
  const adminPhone = process.env.SEED_ADMIN_PHONE ?? "+10000000000";
  await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      role: Role.ADMIN,
      firstName: "Perfecto",
      lastName: "Admin",
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@perfecto.local",
      phoneVerifiedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
    create: {
      phone: adminPhone,
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@perfecto.local",
      firstName: "Perfecto",
      lastName: "Admin",
      role: Role.ADMIN,
      phoneVerifiedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`Admin seeded: ${adminPhone} (dev login — OTP 123123)`);

  // --- Commercial / facility service catalog ---
  const services = [
    {
      slug: "government-municipal",
      name: "Government and Municipal Buildings",
      description:
        "Facility cleaning for city halls, courts, libraries, and police/fire stations — scheduled for public-facing spaces.",
      longDescription:
        "Reliable facility cleaning for city halls, courts, libraries, and public-safety buildings. We support after-hours schedules, high-traffic lobbies, and the appearance standards visitors and staff expect. Programs typically include nightly or weekly cleaning, disinfection of high-touch areas, and periodic deep cleans.",
      includes: [
        "Nightly or weekly cleaning of lobbies, offices, and common areas",
        "Restroom sanitization and restocking",
        "Floor care for high-traffic corridors",
        "Disinfection of high-touch surfaces",
        "Periodic deep cleaning of public spaces",
      ],
      idealFor: ["City halls and municipal offices", "Courts and libraries", "Police and fire stations"],
      pricingNote:
        "Commercial starting estimates — final pricing confirmed after a facility walkthrough. Nightly, weekly, and deep-clean cadences available.",
      basePrice: 45000,
      isPopular: false,
      sortOrder: 1,
      isActive: true,
      imageUrl: "/images/services/government-municipal.png",
    },
    {
      slug: "schools-daycares",
      name: "Schools and Daycares",
      description:
        "Campus and childcare cleaning for K–12, Montessori, and daycare centers with disinfection-forward routines.",
      longDescription:
        "Campus and childcare cleaning built around student and staff safety. From classrooms to cafeterias and play areas, we keep learning environments fresh with scheduled cleaning, disinfection, and periodic deep cleans between terms or peak seasons.",
      includes: [
        "Classroom, hallway, and common-area cleaning",
        "Restroom sanitization sized for school traffic",
        "Cafeteria and break-area surface care",
        "Disinfection of high-touch fixtures and furniture",
        "Scheduled deep cleans between terms or peak seasons",
      ],
      idealFor: ["Public and private K–12 schools", "Montessori programs", "Childcare and daycare centers"],
      pricingNote:
        "Starting estimates vary by square footage and visit frequency. Optional window and carpet cleaning available as add-ons.",
      basePrice: 38000,
      isPopular: false,
      sortOrder: 2,
      isActive: true,
      imageUrl: "/images/services/schools-daycares.png",
    },
    {
      slug: "offices",
      name: "Offices",
      description:
        "Nightly or weekly cleaning for professional offices, admin buildings, and co-working spaces.",
      longDescription:
        "Professional office and co-working cleaning that keeps workspaces presentable for clients and healthier for teams. Nightly or weekly programs with disinfection and optional deep cleans on a cadence that fits your building. Window and carpet care available as add-ons.",
      includes: [
        "Workstations, meeting rooms, and common areas",
        "Kitchen and break-room cleaning",
        "Restroom sanitization and restocking",
        "Trash and recycling removal",
        "Disinfection of high-touch surfaces",
        "Periodic deep cleaning on request",
      ],
      idealFor: ["Professional offices", "Admin buildings", "Co-working spaces"],
      pricingNote:
        "Most popular commercial package. Starting price assumes a typical small-to-mid office footprint — staff will refine after an estimate.",
      basePrice: 28000,
      isPopular: true,
      sortOrder: 3,
      isActive: true,
      imageUrl: "/images/services/offices.png",
    },
    {
      slug: "medical-dental",
      name: "Medical and Dental Offices",
      description:
        "Cleaning for small practices and outpatient clinics with a focus on presentation and high-touch disinfection.",
      longDescription:
        "Cleaning for small medical and dental practices and outpatient clinics where presentation and hygiene matter. We focus on waiting rooms, treatment-adjacent areas, and high-touch surfaces with disinfection-forward routines and periodic deep cleans.",
      includes: [
        "Waiting room and reception cleaning",
        "Restroom sanitization",
        "Disinfection of high-touch surfaces",
        "Floor care suited to clinical foot traffic",
        "Periodic deep cleaning between peak days",
      ],
      idealFor: ["Dental and medical offices", "Outpatient clinics", "Specialty practices"],
      pricingNote:
        "Commercial clinical-suite estimates. Scope is confirmed with your practice manager before the first visit.",
      basePrice: 32000,
      isPopular: false,
      sortOrder: 4,
      isActive: true,
      imageUrl: "/images/services/medical-dental.png",
    },
    {
      slug: "restaurants-nightlife",
      name: "Restaurants, Cafes and Nightclubs",
      description:
        "After-hours cleaning for restaurants, cafes, and nightlife venues — dining rooms, bars, and guest restrooms.",
      longDescription:
        "After-hours cleaning for restaurants, cafes, and nightclubs — fronts of house, dining rooms, bars, and guest restrooms. Nightly resets, disinfection, and periodic deep cleans keep venues guest-ready between busy services.",
      includes: [
        "Dining room, bar, and lounge cleaning",
        "Restroom sanitization after peak service",
        "Floor care for high-traffic guest areas",
        "Disinfection of high-touch surfaces",
        "Periodic deep cleaning between busy seasons",
      ],
      idealFor: ["Restaurants and cafes", "Bars and nightclubs", "Hospitality venues"],
      pricingNote:
        "Hospitality pricing depends on square footage, hours, and kitchen-adjacent scope. Estimate required before recurring service.",
      basePrice: 35000,
      isPopular: false,
      sortOrder: 5,
      isActive: true,
      imageUrl: "/images/services/restaurants-nightlife.png",
    },
  ];

  for (const service of services) {
    const detail = serviceDetails[service.slug];
    await prisma.service.upsert({
      where: { slug: service.slug },
      // Idempotent catalog refresh: keep seed content in sync for redeploys / EC2 db:seed.
      update: {
        name: service.name,
        description: service.description,
        longDescription: service.longDescription,
        includes: service.includes,
        idealFor: service.idealFor,
        pricingNote: service.pricingNote,
        basePrice: service.basePrice,
        isPopular: service.isPopular,
        sortOrder: service.sortOrder,
        isActive: service.isActive,
        imageUrl: service.imageUrl ?? detail?.image ?? null,
      },
      create: {
        slug: service.slug,
        name: service.name,
        description: service.description,
        longDescription: service.longDescription,
        includes: service.includes,
        idealFor: service.idealFor,
        pricingNote: service.pricingNote,
        basePrice: service.basePrice,
        isPopular: service.isPopular,
        sortOrder: service.sortOrder,
        isActive: service.isActive,
        imageUrl: service.imageUrl ?? detail?.image ?? null,
      },
    });
  }
  console.log(`Upserted ${services.length} commercial services.`);

  // Deactivate legacy residential/office catalog (preserve rows for booking history).
  const deactivated = await prisma.service.updateMany({
    where: { slug: { in: [...LEGACY_SERVICE_SLUGS] } },
    data: { isActive: false, isPopular: false },
  });
  if (deactivated.count > 0) {
    console.log(`Deactivated ${deactivated.count} legacy service(s): ${LEGACY_SERVICE_SLUGS.join(", ")}`);
  }

  // --- Commercial facility add-ons ---
  const addOns = [
    { name: "Window Cleaning", price: 7500 },
    { name: "Carpet Cleaning", price: 12000 },
    { name: "Disinfection Boost", price: 5000 },
    { name: "Deep Clean Add-On", price: 15000 },
  ];

  for (const addOn of addOns) {
    const existing = await prisma.addOn.findFirst({ where: { name: addOn.name } });
    if (existing) {
      await prisma.addOn.update({
        where: { id: existing.id },
        data: { price: addOn.price, isActive: true },
      });
    } else {
      await prisma.addOn.create({ data: { ...addOn, isActive: true } });
    }
  }

  for (const name of LEGACY_ADDON_NAMES) {
    await prisma.addOn.updateMany({
      where: { name },
      data: { isActive: false },
    });
  }
  console.log(`Seeded ${addOns.length} commercial add-ons; deactivated legacy residential add-ons.`);

  // Link commercial add-ons to all active commercial services.
  const commercialSlugs = services.map((s) => s.slug);
  const activeAddOns = await prisma.addOn.findMany({
    where: { name: { in: addOns.map((a) => a.name) }, isActive: true },
  });
  for (const slug of commercialSlugs) {
    const service = await prisma.service.findUnique({ where: { slug } });
    if (!service) continue;
    for (const addOn of activeAddOns) {
      await prisma.addOnOnService.upsert({
        where: {
          serviceId_addOnId: { serviceId: service.id, addOnId: addOn.id },
        },
        create: { serviceId: service.id, addOnId: addOn.id },
        update: {},
      });
    }
  }
  console.log(`Linked ${activeAddOns.length} add-ons to ${commercialSlugs.length} services.`);

  // --- Job postings (careers) — Perfecto hiring flyer ---
  const jobPostings = [
    {
      slug: "cleaning-professional",
      title: "Cleaning Professional",
      type: "Full-time / Part-time",
      location: "NOVA / DC / Maryland",
      compensation: "Up to $30/hour",
      summary:
        "Join Perfecto's cleaning team across Northern Virginia, Washington DC, and Maryland. Enjoy flexible schedules, a supportive team, and real growth opportunities while making a difference in every facility we serve. We look for a strong work ethic, attention to detail, reliability, and a positive team-player attitude. Experience is a plus; training is provided. Apply online or reach us at info@perfectodmv.com · @perfectocleanings.",
      sortOrder: 1,
    },
    {
      slug: "cleaning-team-member",
      title: "Cleaning Team Member",
      type: "Full-time / Part-time",
      location: "NOVA / DC / Maryland",
      compensation: "Up to $30/hour",
      summary:
        "We're hiring cleaners for our growing commercial and facility team in NOVA, Washington DC, and Maryland. Benefits include flexible schedules, supportive teammates, and room to grow. Requirements: solid work ethic, eye for detail, reliability, and a positive attitude. Prior experience is a plus; we provide training. Contact info@perfectodmv.com or @perfectocleanings.",
      sortOrder: 2,
    },
  ];

  const activeJobSlugs = jobPostings.map((job) => job.slug);

  for (const job of jobPostings) {
    await prisma.jobPosting.upsert({
      where: { slug: job.slug },
      update: {
        title: job.title,
        type: job.type,
        location: job.location,
        compensation: job.compensation,
        summary: job.summary,
        sortOrder: job.sortOrder,
        isActive: true,
      },
      create: { ...job, isActive: true },
    });
  }

  // Soft-retire any other job postings (legacy residential / prior commercial seeds).
  const deactivatedJobs = await prisma.jobPosting.updateMany({
    where: { slug: { notIn: activeJobSlugs } },
    data: { isActive: false },
  });
  console.log(
    `Seeded ${jobPostings.length} job posting(s); deactivated ${deactivatedJobs.count} legacy job(s).`,
  );

  const gallerySeed = [
    {
      type: "BEFORE_AFTER" as const,
      title: "Lobby floor reset",
      category: "Offices",
      beforeUrl: "/images/gallery-living-before.png",
      afterUrl: "/images/gallery-living-after.png",
      sortOrder: 1,
    },
    {
      type: "BEFORE_AFTER" as const,
      title: "Kitchen / break area deep clean",
      category: "Restaurants",
      beforeUrl: "/images/gallery-kitchen-before.png",
      afterUrl: "/images/gallery-kitchen-after.png",
      sortOrder: 2,
    },
    {
      type: "CARD" as const,
      title: "Polished Office Suite",
      category: "Offices",
      imageUrl: "/images/services/offices.png",
      sortOrder: 3,
    },
    {
      type: "CARD" as const,
      title: "School Corridor Ready",
      category: "Schools",
      imageUrl: "/images/services/schools-daycares.png",
      sortOrder: 4,
    },
    {
      type: "CARD" as const,
      title: "Municipal Lobby Shine",
      category: "Government",
      imageUrl: "/images/services/government-municipal.png",
      sortOrder: 5,
    },
  ];

  for (const item of gallerySeed) {
    const existing = await prisma.galleryItem.findFirst({
      where: { title: item.title, type: item.type },
    });
    if (!existing) {
      await prisma.galleryItem.create({ data: { ...item, isActive: true } });
    }
  }
  console.log(`Seeded ${gallerySeed.length} gallery items.`);

  // --- Promotions (display only in V1.0) ---
  const promo = await prisma.promotion.findFirst({
    where: { title: "First-Time Customer Offer" },
  });
  if (!promo) {
    await prisma.promotion.create({
      data: {
        title: "First-Time Customer Offer",
        description: "Enjoy $30 off your first booking with Perfecto. Welcome aboard!",
        discountType: "FLAT",
        discountValue: 3000,
        isActive: true,
      },
    });
  }

  console.log("Seed complete. Run `npm run db:seed` (or docker seed) to refresh production catalogs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
