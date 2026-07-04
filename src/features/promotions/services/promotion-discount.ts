import type { PromotionDiscountType } from "@prisma/client";

import { formatCurrency } from "@/lib/utils";

export function computePromotionDiscountCents(
  amountCents: number,
  discountType: PromotionDiscountType,
  discountValue: number,
): number {
  if (amountCents <= 0) return 0;

  if (discountType === "FLAT") {
    return Math.min(Math.max(0, discountValue), amountCents);
  }

  const percent = Math.min(Math.max(0, discountValue), 100);
  return Math.round((amountCents * percent) / 100);
}

export function formatPromotionDiscountLabel(
  discountType: PromotionDiscountType,
  discountValue: number,
): string {
  if (discountType === "FLAT") {
    return `${formatCurrency(discountValue)} off`;
  }
  return `${discountValue}% off`;
}

export function promotionAppliesToService(
  serviceIds: string[],
  serviceId: string,
): boolean {
  if (serviceIds.length === 0) return true;
  return serviceIds.includes(serviceId);
}
