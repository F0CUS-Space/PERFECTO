import { PrismaClient, Role } from "@prisma/client";

import { serviceDetails } from "../src/content/services-detail";

const prisma = new PrismaClient();

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

  // --- Service catalog ---
  const services = [
    {
      slug: "residential-cleaning",
      name: "Residential Cleaning",
      description:
        "Our signature recurring service for maintaining a spotless, healthy living environment day after day.",
      basePrice: 12000,
      isPopular: true,
      sortOrder: 1,
    },
    {
      slug: "deep-cleaning",
      name: "Deep Cleaning",
      description:
        "An exhaustive restoration of your home from floor to ceiling. Ideal for first-time visits.",
      basePrice: 28000,
      sortOrder: 2,
    },
    {
      slug: "move-in-out",
      name: "Move In / Out",
      description: "A stress-free transition with a comprehensive top-to-bottom clean.",
      basePrice: 15000,
      sortOrder: 3,
    },
    {
      slug: "office-cleaning",
      name: "Office Cleaning",
      description: "Elevate your professional workspace for better focus and hygiene.",
      basePrice: 20000,
      sortOrder: 4,
    },
    {
      slug: "recurring-cleaning",
      name: "Recurring Cleaning",
      description: "Subscription-based cleaning for consistent, worry-free maintenance.",
      basePrice: 11000,
      sortOrder: 5,
    },
  ];

  for (const service of services) {
    const detail = serviceDetails[service.slug];
    const marketing = {
      longDescription: detail?.longDescription ?? null,
      includes: detail?.includes ?? [],
      idealFor: detail?.idealFor ?? [],
      pricingNote: null,
      imageUrl: detail?.image ?? null,
    };
    await prisma.service.upsert({
      where: { slug: service.slug },
      // Only fill marketing fields on first create — do not overwrite admin edits on redeploy.
      update: {
        name: service.name,
        description: service.description,
        basePrice: service.basePrice,
        isPopular: service.isPopular,
        sortOrder: service.sortOrder,
      },
      create: { ...service, ...marketing },
    });
  }

  // --- Add-ons ---
  const addOns = [
    { name: "Inside Fridge", price: 2500 },
    { name: "Inside Oven", price: 2500 },
    { name: "Interior Windows", price: 3000 },
    { name: "Laundry & Folding", price: 2000 },
    { name: "Inside Cabinets", price: 2000 },
  ];

  for (const addOn of addOns) {
    const existing = await prisma.addOn.findFirst({ where: { name: addOn.name } });
    if (!existing) {
      await prisma.addOn.create({ data: addOn });
    }
  }

  // Link add-ons to residential-style services (quote calculator eligibility).
  const residentialSlugs = [
    "residential-cleaning",
    "deep-cleaning",
    "move-in-out",
    "recurring-cleaning",
  ];
  const allAddOns = await prisma.addOn.findMany({ where: { isActive: true } });
  for (const slug of residentialSlugs) {
    const service = await prisma.service.findUnique({ where: { slug } });
    if (!service) continue;
    for (const addOn of allAddOns) {
      await prisma.addOnOnService.upsert({
        where: {
          serviceId_addOnId: { serviceId: service.id, addOnId: addOn.id },
        },
        create: { serviceId: service.id, addOnId: addOn.id },
        update: {},
      });
    }
  }
  console.log(`Linked ${allAddOns.length} add-ons to ${residentialSlugs.length} services.`);

  // --- Job postings (careers) ---
  const jobPostings = [
    {
      slug: "residential-cleaning-professional",
      title: "Residential Cleaning Professional",
      type: "Full-time / Part-time",
      location: "Local",
      summary:
        "Deliver meticulous residential cleans, represent the Perfecto standard, and build lasting trust with our clients.",
      sortOrder: 1,
    },
    {
      slug: "deep-cleaning-specialist",
      title: "Deep Cleaning Specialist",
      type: "Full-time",
      location: "Local",
      summary:
        "Tackle detailed, top-to-bottom restorations with an eye for the spots others miss.",
      sortOrder: 2,
    },
    {
      slug: "team-lead-operations",
      title: "Team Lead — Operations",
      type: "Full-time",
      location: "Local",
      summary:
        "Coordinate schedules, mentor cleaning professionals, and ensure every job meets our quality bar.",
      sortOrder: 3,
    },
  ];

  for (const job of jobPostings) {
    await prisma.jobPosting.upsert({
      where: { slug: job.slug },
      update: {
        title: job.title,
        type: job.type,
        location: job.location,
        summary: job.summary,
        sortOrder: job.sortOrder,
        isActive: true,
      },
      create: job,
    });
  }
  console.log(`Seeded ${jobPostings.length} job postings.`);

  const gallerySeed = [
    {
      type: "BEFORE_AFTER" as const,
      title: "Living room reset",
      category: "Residential",
      beforeUrl: "/images/gallery-living-before.png",
      afterUrl: "/images/gallery-living-after.png",
      sortOrder: 1,
    },
    {
      type: "BEFORE_AFTER" as const,
      title: "Kitchen deep clean",
      category: "Deep Clean",
      beforeUrl: "/images/gallery-kitchen-before.png",
      afterUrl: "/images/gallery-kitchen-after.png",
      sortOrder: 2,
    },
    {
      type: "CARD" as const,
      title: "Sparkling Living Room",
      category: "Residential",
      imageUrl: "/images/service-residential.png",
      sortOrder: 3,
    },
    {
      type: "CARD" as const,
      title: "Spotless Kitchen",
      category: "Deep Clean",
      imageUrl: "/images/service-recurring.png",
      sortOrder: 4,
    },
    {
      type: "CARD" as const,
      title: "Polished Office",
      category: "Office",
      imageUrl: "/images/service-office.png",
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
        description: "Enjoy $30 off your first booking with Perfecto. Welcome to a cleaner home!",
        discountType: "FLAT",
        discountValue: 3000,
        isActive: true,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
