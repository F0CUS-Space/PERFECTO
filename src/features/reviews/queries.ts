import "server-only";

import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-ready";

export interface TestimonialRow {
  id: string;
  name: string;
  location: string;
  rating: number;
  quote: string;
}

export async function getFeaturedTestimonials(): Promise<TestimonialRow[]> {
  if (!isDatabaseConfigured()) return [];

  const reviews = await prisma.review.findMany({
    where: { status: "APPROVED", featured: true },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      user: { select: { firstName: true, lastName: true, phone: true } },
      booking: { select: { city: true } },
    },
  });

  return reviews.map((review) => ({
    id: review.id,
    name: [review.user.firstName, review.user.lastName].filter(Boolean).join(" ").trim() || "Perfecto customer",
    location: review.booking.city,
    rating: review.rating,
    quote: review.body,
  }));
}

export async function getAdminReviews() {
  if (!isDatabaseConfigured()) return [];

  return prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { firstName: true, lastName: true, phone: true, email: true } },
      booking: { select: { id: true, city: true, service: { select: { name: true } } } },
    },
  });
}
