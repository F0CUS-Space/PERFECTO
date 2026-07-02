import { z } from "zod";

import { jobPositionTitles } from "./positions";

const positionEnum = z.enum(
  jobPositionTitles as [string, ...string[]],
  { message: "Select a valid position" },
);

export const jobApplicationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(10, "Enter a valid phone number").max(20),
  position: positionEnum,
  coverNote: z.string().trim().max(2000).optional(),
  resumeS3Key: z.string().min(1, "Attach your resume (PDF)"),
  resumeUrl: z.string().url().optional(),
  /** Honeypot — must stay empty. */
  companyWebsite: z.literal("").optional(),
});

export type JobApplicationInput = z.infer<typeof jobApplicationSchema>;
