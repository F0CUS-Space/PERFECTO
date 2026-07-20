"use server";

import { contactSchema, type ContactInput } from "@/features/contact/schema";
import { resolveContactInbox } from "@/features/contact/config";
import {
  contactEnquiryAdminEmail,
  contactEnquiryConfirmationEmail,
} from "@/features/contact/emails/contact-enquiry-email";
import { sendEmail } from "@/lib/email";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export interface ActionResult {
  success: boolean;
  message: string;
}

export async function submitContactForm(input: ContactInput): Promise<ActionResult> {
  const limit = await rateLimit(`contact:${await getClientIp()}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return {
      success: false,
      message: "You've sent several messages already. Please wait a few minutes and try again.",
    };
  }

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Please check the form and try again." };
  }

  const { name, email, phone, message } = parsed.data;
  const inbox = resolveContactInbox();
  const adminEmail = contactEnquiryAdminEmail({ name, email, phone, message });

  try {
    const result = await sendEmail({
      to: inbox,
      replyTo: email,
      subject: adminEmail.subject,
      html: adminEmail.html,
    });

    if (result.skipped) {
      console.warn("[contact] email skipped — RESEND_API_KEY not configured");
      return {
        success: false,
        message:
          "We couldn't send your message right now. Please email us directly or call the number on this page.",
      };
    }

    const confirmation = contactEnquiryConfirmationEmail({ name });
    void sendEmail({
      to: email,
      subject: confirmation.subject,
      html: confirmation.html,
    }).catch((error) => {
      console.error("[contact] confirmation email failed", error);
    });

    return {
      success: true,
      message: "Thanks for reaching out! We'll get back to you shortly.",
    };
  } catch (error) {
    console.error("[contact] send failed", error);
    return {
      success: false,
      message: "Something went wrong sending your message. Please try again or call us.",
    };
  }
}
