import { env } from "@/env";
import { siteConfig } from "@/config/site";
import { escapeHtml } from "@/lib/escape-html";

function adminApplicationUrl(applicationId: string): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}/admin/applications/${applicationId}`;
}

export function applicationReceivedApplicantEmail(params: {
  fullName: string;
  position: string;
}) {
  const fullName = escapeHtml(params.fullName);
  const position = escapeHtml(params.position);

  return {
    subject: `Application received — ${params.position}`,
    html: `
      <p>Hi ${fullName},</p>
      <p>Thank you for applying for <strong>${position}</strong> at ${escapeHtml(siteConfig.name)}.</p>
      <p>Our team will review your application and get back to you soon.</p>
      <p>— The Perfecto Team</p>
    `,
  };
}

export function applicationReceivedAdminEmail(params: {
  fullName: string;
  email: string;
  phone: string;
  position: string;
  applicationId: string;
}) {
  const fullName = escapeHtml(params.fullName);
  const email = escapeHtml(params.email);
  const phone = escapeHtml(params.phone);
  const position = escapeHtml(params.position);
  const reviewUrl = adminApplicationUrl(params.applicationId);

  return {
    subject: `New job application — ${params.position}`,
    html: `
      <h2>New application</h2>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Position:</strong> ${position}</p>
      <p><a href="${reviewUrl}">Review in admin dashboard</a></p>
    `,
  };
}

export function applicationAcceptedEmail(params: { fullName: string; position: string }) {
  const fullName = escapeHtml(params.fullName);
  const position = escapeHtml(params.position);

  return {
    subject: `Welcome to Perfecto — ${params.position}`,
    html: `
      <p>Hi ${fullName},</p>
      <p>Great news — we would love to move forward with your application for <strong>${position}</strong>.</p>
      <p>Our team will contact you shortly with next steps.</p>
      <p>— The Perfecto Team</p>
    `,
  };
}

export function applicationRejectedEmail(params: { fullName: string; position: string }) {
  const fullName = escapeHtml(params.fullName);
  const position = escapeHtml(params.position);

  return {
    subject: `Update on your application — ${params.position}`,
    html: `
      <p>Hi ${fullName},</p>
      <p>Thank you for your interest in <strong>${position}</strong> at ${escapeHtml(siteConfig.name)}.</p>
      <p>After careful review, we will not be moving forward with your application at this time. We encourage you to apply again in the future.</p>
      <p>— The Perfecto Team</p>
    `,
  };
}

export function applicationUnderReviewEmail(params: { fullName: string; position: string }) {
  const fullName = escapeHtml(params.fullName);
  const position = escapeHtml(params.position);

  return {
    subject: `Your application is under review — ${params.position}`,
    html: `
      <p>Hi ${fullName},</p>
      <p>We are reviewing your application for <strong>${position}</strong> at ${escapeHtml(siteConfig.name)}.</p>
      <p>We will follow up once a decision has been made.</p>
      <p>— The Perfecto Team</p>
    `,
  };
}
