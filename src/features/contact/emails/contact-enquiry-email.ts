import { escapeHtml } from "@/lib/escape-html";
import { siteConfig } from "@/config/site";

export function contactEnquiryAdminEmail(params: {
  name: string;
  email: string;
  phone: string;
  message: string;
}) {
  const safeName = escapeHtml(params.name);
  const safeEmail = escapeHtml(params.email);
  const safePhone = escapeHtml(params.phone);
  const safeMessage = escapeHtml(params.message).replace(/\n/g, "<br/>");

  return {
    subject: `New contact enquiry from ${params.name}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;color:#0f2744">
        <h2 style="margin:0 0 16px">New contact enquiry</h2>
        <p style="margin:0 0 8px"><strong>Name:</strong> ${safeName}</p>
        <p style="margin:0 0 8px"><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
        <p style="margin:0 0 16px"><strong>Phone:</strong> ${safePhone}</p>
        <p style="margin:0 0 8px;font-weight:600">Message</p>
        <p style="margin:0;line-height:1.6;color:#334155">${safeMessage}</p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0" />
        <p style="margin:0;font-size:12px;color:#64748b">Reply directly to this email to reach ${safeName}.</p>
      </div>
    `,
  };
}

export function contactEnquiryConfirmationEmail(params: { name: string }) {
  const firstName = escapeHtml(params.name.trim().split(/\s+/)[0] || "there");

  return {
    subject: `We received your message — ${siteConfig.shortName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;color:#0f2744">
        <h2 style="margin:0 0 12px">Thanks for contacting ${escapeHtml(siteConfig.shortName)}</h2>
        <p style="margin:0 0 12px;line-height:1.6;color:#334155">
          Hi ${firstName}, we received your message and will get back to you shortly.
        </p>
        <p style="margin:0;line-height:1.6;color:#334155">
          If your request is urgent, call us at ${escapeHtml(siteConfig.contact.phone)}.
        </p>
      </div>
    `,
  };
}
