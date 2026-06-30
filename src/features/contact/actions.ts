"use server";

import { contactSchema, type ContactInput } from "@/features/contact/schema";
import { sendEmail } from "@/lib/email";
import { siteConfig } from "@/config/site";

export interface ActionResult {
  success: boolean;
  message: string;
}

export async function submitContactForm(input: ContactInput): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Please check the form and try again." };
  }

  const { name, email, phone, message } = parsed.data;

  try {
    await sendEmail({
      to: siteConfig.contact.email,
      subject: `New contact enquiry from ${name}`,
      html: `
        <h2>New contact enquiry</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br/>")}</p>
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
