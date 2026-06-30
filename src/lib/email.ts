import "server-only";

import { Resend } from "resend";

import { env, requireEnv } from "@/env";

let resendClient: Resend | undefined;

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(requireEnv("RESEND_API_KEY"));
  }
  return resendClient;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Transactional email sender. Centralized so templates and provider can evolve
 * (V3.0 may add additional channels) behind a stable interface.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!env.RESEND_API_KEY) {
    // In development without keys, log instead of failing the flow.
    console.warn(`[email] RESEND_API_KEY not set — skipping email "${subject}" to ${to}`);
    return { skipped: true as const };
  }

  const { data, error } = await getResend().emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return { id: data?.id, skipped: false as const };
}
