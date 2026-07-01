"use server";

import { z } from "zod";

import { getServiceQuoteProfile } from "@/config/service-quote-profiles";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";

import { parseQuoteInput } from "./schema";
import { calculateQuote, type QuoteCalculation } from "./services/pricing";

export type SaveQuoteResult =
  | {
      ok: true;
      quoteId: string;
      calculation: QuoteCalculation;
      serviceName: string;
      serviceSlug: string;
    }
  | { ok: false; error: string };

/** Persists a quote after server-side price validation. */
export async function saveQuote(raw: unknown): Promise<SaveQuoteResult> {
  try {
    const serviceId =
      typeof raw === "object" && raw !== null && "serviceId" in raw
        ? String((raw as { serviceId: unknown }).serviceId)
        : "";

    const serviceLookup = await prisma.service.findFirst({
      where: { id: serviceId, isActive: true },
      select: { id: true, slug: true, name: true, basePrice: true },
    });

    if (!serviceLookup) {
      return { ok: false, error: "Service not found." };
    }

    const profile = getServiceQuoteProfile(serviceLookup.slug);
    const input = parseQuoteInput(raw, serviceLookup.slug);

    const service = await prisma.service.findFirst({
      where: { id: input.serviceId, isActive: true },
      include: {
        addOns: {
          where: { addOn: { isActive: true } },
          include: { addOn: true },
        },
      },
    });

    if (!service) {
      return { ok: false, error: "Service not found." };
    }

    const validAddOnIds = new Set(service.addOns.map((link) => link.addOnId));
    const invalidAddOn = input.addOnIds.find((id) => !validAddOnIds.has(id));
    if (invalidAddOn) {
      return { ok: false, error: "One or more add-ons are not available for this service." };
    }

    const selectedAddOns = service.addOns
      .filter((link) => input.addOnIds.includes(link.addOnId))
      .map((link) => ({
        id: link.addOn.id,
        name: link.addOn.name,
        priceCents: link.addOn.price,
      }));

    const calculation = calculateQuote({
      pricingMode: profile.pricingMode,
      serviceBasePriceCents: service.basePrice,
      serviceName: service.name,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      workstations: input.workstations,
      propertySize: input.propertySize,
      furnished: input.furnished,
      hasPets: input.hasPets,
      frequency: input.frequency,
      addOns: selectedAddOns,
      sqftIncluded: profile.sqftIncluded,
    });

    if (
      input.clientTotalCents !== undefined &&
      input.clientTotalCents !== calculation.estimatedTotalCents
    ) {
      return {
        ok: false,
        error: "Your estimate changed. Please review the updated total and try again.",
      };
    }

    const user = await getCurrentUser();

    const quote = await prisma.quote.create({
      data: {
        userId: user?.id ?? null,
        serviceId: service.id,
        bedrooms: input.bedrooms ?? 0,
        bathrooms: input.bathrooms ?? 0,
        propertySize: input.propertySize ?? null,
        hasPets: input.hasPets ?? false,
        frequency: input.frequency,
        estimatedTotal: calculation.estimatedTotalCents,
        breakdown: JSON.parse(JSON.stringify(calculation)),
        addOns: {
          create: input.addOnIds.map((addOnId) => ({ addOnId })),
        },
      },
    });

    return {
      ok: true,
      quoteId: quote.id,
      calculation,
      serviceName: service.name,
      serviceSlug: service.slug,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: error.errors[0]?.message ?? "Invalid quote details." };
    }
    console.error("[saveQuote]", error);
    return { ok: false, error: "Unable to save your quote. Please try again." };
  }
}
