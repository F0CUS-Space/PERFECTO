"use server";

import { contactSchema, type ContactInput } from "@/features/contact/schema";
import { sendEmail } from "@/lib/email";
import { siteConfig } from "@/config/site";
import { escapeHtml } from "@/lib/escape-html";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export interface ActionResult {
  success: boolean;
  message: string;
}

export async function submitContactForm(input: ContactInput): Promise<ActionResult> {
  const limit = rateLimit(`contact:${await getClientIp()}`, 5, 10 * 60 * 1000);
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
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");

  try {
    await sendEmail({
      to: siteConfig.contact.email,
      subject: `New contact enquiry from ${name}`,
      html: `
        <h2>New contact enquiry</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Phone:</strong> ${safePhone}</p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage}</p>
      `,
    });

    return {
      success: true,
      message: "Thanks for reaching out! We'll get back to you shortly.",
    };
  } catch {
    return {
      success: false,
      message: "Something went wrong sending your message. Please try again or call us.",
    };
  }
}
