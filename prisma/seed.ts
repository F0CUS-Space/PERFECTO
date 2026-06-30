import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Perfecto database...");

  // --- Admin user (phone-first; phone pre-verified for the initial admin) ---
  const adminPhone = process.env.SEED_ADMIN_PHONE ?? "+10000000000";
  await prisma.user.upsert({
    where: { phone: adminPhone },
    update: { role: Role.ADMIN },
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
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: service,
      create: service,
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

  // --- Promotions (display only in V1.0) ---
  const promo = await prisma.promotion.findFirst({
    where: { title: "First-Time Customer Offer" },
  });
  if (!promo) {
    await prisma.promotion.create({
      data: {
        title: "First-Time Customer Offer",
        description: "Enjoy $30 off your first booking with Perfecto. Welcome to a cleaner home!",
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
