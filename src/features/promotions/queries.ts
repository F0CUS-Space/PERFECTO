import "server-only";

import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-ready";

/** Active promotions for the public promotions page (display only in V1.0). */
export async function getActivePromotions() {
  if (!isDatabaseConfigured()) return [];
  try {
    return await prisma.promotion.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}
