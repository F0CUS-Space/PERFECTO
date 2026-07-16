import { z } from "zod";

import { minScheduleDateString, parseScheduleDate } from "@/config/booking";
import {
  accessStepSchema,
  agreementStepSchema,
  propertyStepSchema,
  scheduleStepSchema,
} from "@/features/booking/schema";

export const offerLineSchema = z.object({
  addOnId: z.string().min(1).optional().nullable(),
  name: z.string().min(1, "Line item name is required").max(120),
  priceCents: z.number().int().min(0, "Price cannot be negative"),
});

export const createBookingOfferSchema = z.object({
  userId: z.string().min(1).optional().nullable(),
  customerName: z.string().min(1, "Customer name is required").max(120),
  customerEmail: z
    .union([z.string().email("Enter a valid email"), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (!value || value === "") return null;
      return value.trim();
    }),
  customerPhone: z
    .union([z.string().max(40), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (!value || value === "") return null;
      return value.trim();
    }),
  serviceId: z.string().min(1, "Pick a service"),
  servicePriceCents: z.number().int().min(0, "Service price cannot be negative"),
  lines: z.array(offerLineSchema).max(40).default([]),
  staffNotes: z.string().max(4000).optional().nullable(),
  messageToCustomer: z.string().max(2000).optional().nullable(),
  sendNow: z.boolean().default(true),
});

export const completeBookingOfferSchema = z
  .object({
    token: z.string().min(1),
    ...propertyStepSchema.shape,
    ...scheduleStepSchema.shape,
    ...accessStepSchema.shape,
    agreement: agreementStepSchema,
  })
  .transform((data) => ({
    ...data,
    scheduledDate: parseScheduleDate(data.scheduledDate),
  }));

export type CreateBookingOfferInput = z.infer<typeof createBookingOfferSchema>;
export type CompleteBookingOfferInput = z.input<typeof completeBookingOfferSchema>;

export { minScheduleDateString };
