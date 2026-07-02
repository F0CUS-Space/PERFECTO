import { z } from "zod";

export const jobApplicationSchema = z.object({
  fullName: z.string().min(2, "Enter your full name").max(120),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(10, "Enter a valid phone number").max(20),
  position: z.string().min(2, "Select a position").max(120),
  coverNote: z.string().max(2000).optional(),
  resumeS3Key: z.string().optional(),
  resumeUrl: z.string().url().optional(),
});

export type JobApplicationInput = z.infer<typeof jobApplicationSchema>;
