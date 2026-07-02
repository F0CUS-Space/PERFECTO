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
  | { ok: true; applicationId: string; confirmationEmailSent: boolean }
  | { ok: false; error: string };

const ACTIVE_STATUSES = ["SUBMITTED", "UNDER_REVIEW"] as const;

async function sendApplicationEmails(params: {
  applicationId: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
}): Promise<boolean> {
  let confirmationEmailSent = true;

  try {
    const applicantEmail = applicationReceivedApplicantEmail({
      fullName: params.fullName,
      position: params.position,
    });
    const applicantResult = await sendEmail({
      to: params.email,
      subject: applicantEmail.subject,
      html: applicantEmail.html,
    });
    if (applicantResult.skipped) {
      confirmationEmailSent = false;
    }
  } catch (error) {
    console.error("[submitJobApplication] applicant email failed", error);
    confirmationEmailSent = false;
  }

  try {
    const adminEmail = applicationReceivedAdminEmail({
      fullName: params.fullName,
      email: params.email,
      phone: params.phone,
      position: params.position,
      applicationId: params.applicationId,
    });
    await sendEmail({
      to: siteConfig.contact.email,
      subject: adminEmail.subject,
      html: adminEmail.html,
    });
  } catch (error) {
    console.error("[submitJobApplication] admin email failed", error);
  }

  return confirmationEmailSent;
}

export async function submitJobApplication(
  input: JobApplicationInput,
): Promise<SubmitApplicationResult> {
  if (input.companyWebsite) {
    return { ok: true, applicationId: "", confirmationEmailSent: false };
  }

  const parsed = jobApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid application." };
  }

  const { fullName, email, phone, position, coverNote, resumeS3Key, resumeUrl } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  try {
    const existing = await prisma.jobApplication.findFirst({
      where: {
        email: normalizedEmail,
        position,
        status: { in: [...ACTIVE_STATUSES] },
      },
      select: { id: true },
    });

    if (existing) {
      return {
        ok: false,
        error: "You already have an open application for this position. Our team will be in touch.",
      };
    }

    const application = await prisma.jobApplication.create({
      data: {
        fullName,
        email: normalizedEmail,
        phone,
        position,
        coverNote: coverNote || null,
        resumeS3Key,
        resumeUrl: resumeUrl ?? null,
        status: "SUBMITTED",
      },
    });

    const confirmationEmailSent = await sendApplicationEmails({
      applicationId: application.id,
      fullName,
      email: normalizedEmail,
      phone,
      position,
    });

    return { ok: true, applicationId: application.id, confirmationEmailSent };
  } catch (error) {
    console.error("[submitJobApplication]", error);
    return { ok: false, error: "Unable to submit application. Please try again." };
  }
}
