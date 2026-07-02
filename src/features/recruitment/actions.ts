"use server";

import { siteConfig } from "@/config/site";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

import {
  applicationReceivedAdminEmail,
  applicationReceivedApplicantEmail,
} from "./emails";
import { jobApplicationSchema, type JobApplicationInput } from "./schema";

export type SubmitApplicationResult =
  | { ok: true; applicationId: string }
  | { ok: false; error: string };

export async function submitJobApplication(
  input: JobApplicationInput,
): Promise<SubmitApplicationResult> {
  const parsed = jobApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid application." };
  }

  const { fullName, email, phone, position, coverNote, resumeS3Key, resumeUrl } = parsed.data;

  try {
    const application = await prisma.jobApplication.create({
      data: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        position: position.trim(),
        coverNote: coverNote?.trim() || null,
        resumeS3Key: resumeS3Key ?? null,
        resumeUrl: resumeUrl ?? null,
        status: "SUBMITTED",
      },
    });

    const applicantEmail = applicationReceivedApplicantEmail({ fullName, position });
    await sendEmail({
      to: application.email,
      subject: applicantEmail.subject,
      html: applicantEmail.html,
    });

    const adminEmail = applicationReceivedAdminEmail({
      fullName,
      email: application.email,
      phone: application.phone,
      position,
      applicationId: application.id,
    });
    await sendEmail({
      to: siteConfig.contact.email,
      subject: adminEmail.subject,
      html: adminEmail.html,
    });

    return { ok: true, applicationId: application.id };
  } catch (error) {
    console.error("[submitJobApplication]", error);
    return { ok: false, error: "Unable to submit application. Please try again." };
  }
}
