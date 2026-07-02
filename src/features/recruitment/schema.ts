import { z } from "zod";

const jobApplicationFields = {
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(10, "Enter a valid phone number").max(20),
  coverNote: z.string().trim().max(2000).optional(),
  resumeS3Key: z.string().min(1, "Attach your resume (PDF)"),
  resumeUrl: z.string().url().optional(),
  /** Honeypot — must stay empty. */
  companyWebsite: z.literal("").optional(),
};

export function createJobApplicationSchema(positionTitles: string[]) {
  const positionSchema =
    positionTitles.length > 0
      ? z.enum(positionTitles as [string, ...string[]], {
          message: "Select a valid position",
        })
      : z.string().refine(() => false, { message: "No open positions are available right now." });

  return z.object({
    ...jobApplicationFields,
    position: positionSchema,
  });
}

export type JobApplicationInput = z.infer<ReturnType<typeof createJobApplicationSchema>>;
