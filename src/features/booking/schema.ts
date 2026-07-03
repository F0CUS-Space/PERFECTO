import { z } from "zod";

import { minScheduleDateString, parseScheduleDate } from "@/config/booking";

export const propertyStepSchema = z.object({
  addressLine: z.string().min(5, "Enter a street address"),
  city: z.string().min(2, "Enter a city"),
  postalCode: z
    .string()
    .min(5, "Enter a valid ZIP/postal code")
    .max(10)
    .regex(/^[\d\w\s-]+$/, "Invalid postal code format"),
  petNotes: z.string().max(500).optional(),
});

export const scheduleStepSchema = z.object({
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
    .refine((val) => val >= minScheduleDateString(), "Date must be at least tomorrow"),
  arrivalWindow: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a valid arrival time"),
});

export const accessStepSchema = z.object({
  accessInfo: z.string().max(1000).optional(),
  specialInstructions: z.string().max(2000).optional(),
});

export const agreementStepSchema = z.object({
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions" }),
  }),
  acceptedCancellation: z.literal(true, {
    errorMap: () => ({ message: "You must accept the cancellation policy" }),
  }),
  acceptedLiability: z.literal(true, {
    errorMap: () => ({ message: "You must accept the liability policy" }),
  }),
  signatureName: z.string().min(2, "Type your full name to sign"),
});

export const bookingPhotoSchema = z.object({
  s3Key: z.string().min(1),
  url: z.string().url(),
  previewUrl: z.string().optional(),
});

export const createBookingSchema = z
  .object({
    quoteId: z.string().min(1),
    ...propertyStepSchema.shape,
    ...scheduleStepSchema.shape,
    ...accessStepSchema.shape,
    agreement: agreementStepSchema,
    photos: z.array(bookingPhotoSchema).max(5).default([]),
  })
  .transform((data) => ({
    ...data,
    scheduledDate: parseScheduleDate(data.scheduledDate),
  }));

export type PropertyStepInput = z.infer<typeof propertyStepSchema>;
export type ScheduleStepInput = z.infer<typeof scheduleStepSchema>;
export type AccessStepInput = z.infer<typeof accessStepSchema>;
export type AgreementStepInput = z.infer<typeof agreementStepSchema>;
export type BookingPhotoInput = z.infer<typeof bookingPhotoSchema>;
export type CreateBookingInput = z.input<typeof createBookingSchema>;
