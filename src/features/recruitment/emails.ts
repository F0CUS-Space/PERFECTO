import { siteConfig } from "@/config/site";

export function applicationReceivedApplicantEmail(params: {
  fullName: string;
  position: string;
}) {
  return {
    subject: `Application received — ${params.position}`,
    html: `
      <p>Hi ${params.fullName},</p>
      <p>Thank you for applying for <strong>${params.position}</strong> at ${siteConfig.name}.</p>
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
  return {
    subject: `New job application — ${params.position}`,
    html: `
      <h2>New application</h2>
      <p><strong>Name:</strong> ${params.fullName}</p>
      <p><strong>Email:</strong> ${params.email}</p>
      <p><strong>Phone:</strong> ${params.phone}</p>
      <p><strong>Position:</strong> ${params.position}</p>
      <p>Review in the admin dashboard: /admin/applications/${params.applicationId}</p>
    `,
  };
}

export function applicationAcceptedEmail(params: { fullName: string; position: string }) {
  return {
    subject: `Welcome to Perfecto — ${params.position}`,
    html: `
      <p>Hi ${params.fullName},</p>
      <p>Great news — we would love to move forward with your application for <strong>${params.position}</strong>.</p>
      <p>Our team will contact you shortly with next steps.</p>
      <p>— The Perfecto Team</p>
    `,
  };
}

export function applicationRejectedEmail(params: { fullName: string; position: string }) {
  return {
    subject: `Update on your application — ${params.position}`,
    html: `
      <p>Hi ${params.fullName},</p>
      <p>Thank you for your interest in <strong>${params.position}</strong> at ${siteConfig.name}.</p>
      <p>After careful review, we will not be moving forward with your application at this time. We encourage you to apply again in the future.</p>
      <p>— The Perfecto Team</p>
    `,
  };
}
