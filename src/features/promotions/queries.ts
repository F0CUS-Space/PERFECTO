import "server-only";

import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-ready";

import {
  formatPromotionDiscountLabel,
  promotionAppliesToService,
} from "./services/promotion-discount";

export type PublicPromotion = {
  id: string;
  title: string;
  description: string;
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number;
  discountLabel: string;
  serviceIds: string[];
  serviceNames: string[];
  appliesToAllServices: boolean;
};

export type ClaimablePromotion = PublicPromotion;

function mapPromotion(
  promotion: {
    id: string;
    title: string;
    description: string;
    discountType: "FLAT" | "PERCENTAGE";
    discountValue: number;
    services: { serviceId: string; service: { name: string } }[];
  },
): PublicPromotion {
  const serviceIds = promotion.services.map((link) => link.serviceId);
  const serviceNames = promotion.services.map((link) => link.service.name);

  return {
    id: promotion.id,
    title: promotion.title,
    description: promotion.description,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue,
    discountLabel: formatPromotionDiscountLabel(promotion.discountType, promotion.discountValue),
    serviceIds,
    serviceNames,
    appliesToAllServices: serviceIds.length === 0,
  };
}

const promotionInclude = {
  services: {
    include: {
      service: { select: { id: true, name: true } },
    },
  },
} as const;

/** Active promotions for the public promotions page. */
export async function getActivePromotions(): Promise<PublicPromotion[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const promotions = await prisma.promotion.findMany({
      where: { isActive: true },
      include: promotionInclude,
      orderBy: { createdAt: "desc" },
    });
    return promotions.map(mapPromotion);
  } catch {
    return [];
  }
}

/** Load a single active promotion for the claim/booking flow. */
export async function getClaimablePromotionById(
  promotionId: string,
): Promise<ClaimablePromotion | null> {
  if (!isDatabaseConfigured() || !promotionId) return null;
  try {
    const promotion = await prisma.promotion.findFirst({
      where: { id: promotionId, isActive: true },
      include: promotionInclude,
    });
    return promotion ? mapPromotion(promotion) : null;
  } catch {
    return null;
  }
}

/** Validate that an active promotion applies to the selected service. */
export async function getPromotionForService(promotionId: string, serviceId: string) {
  if (!isDatabaseConfigured()) return null;

  const promotion = await prisma.promotion.findFirst({
    where: { id: promotionId, isActive: true },
    include: promotionInclude,
  });

  if (!promotion) return null;

  const serviceIds = promotion.services.map((link) => link.serviceId);
  if (!promotionAppliesToService(serviceIds, serviceId)) {
    return null;
  }

  return promotion;
}
