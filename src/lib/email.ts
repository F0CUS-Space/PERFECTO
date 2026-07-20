import "server-only";

import { Resend } from "resend";

import { env, requireEnv } from "@/env";
import { redactEmail } from "@/lib/redact";

let resendClient: Resend | undefined;

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(requireEnv("RESEND_API_KEY"));
  }
  return resendClient;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string | string[];
  attachments?: EmailAttachment[];
}

function encodeAttachmentContent(content: Buffer | string): string {
  if (typeof content === "string") {
    return content;
  }
  return content.toString("base64");
}

/**
 * Transactional email sender. Centralized so templates and provider can evolve
 * (V3.0 may add additional channels) behind a stable interface.
 */
export async function sendEmail({ to, subject, html, replyTo, attachments }: SendEmailParams) {
  if (!env.RESEND_API_KEY) {
    const recipients = (Array.isArray(to) ? to : [to]).map(redactEmail).join(", ");
    console.warn(`[email] RESEND_API_KEY not set — skipping email "${subject}" to ${recipients}`);
    return { skipped: true as const };
  }

  const { data, error } = await getResend().emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    ...(replyTo ? { replyTo } : {}),
    attachments: attachments?.map((file) => ({
      filename: file.filename,
      content: encodeAttachmentContent(file.content),
      content_type: file.contentType,
    })),
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return { id: data?.id, skipped: false as const };
}
