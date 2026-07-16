import { siteConfig } from "@/config/site";
import { escapeHtml } from "@/lib/escape-html";
import {
  emailLayout,
  primaryButton,
} from "@/features/notifications/emails/booking-emails";

import type { OfferBreakdown } from "../types";

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
}

export function estimateOfferEmail(params: {
  customerName: string;
  serviceName: string;
  totalAmount: number;
  breakdown: OfferBreakdown;
  messageToCustomer?: string | null;
  expiresAt: Date;
  payLinkUrl: string;
  appUrl: string;
}): { subject: string; html: string } {
  const lineRows = [
    `<tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${escapeHtml(params.serviceName)}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatMoney(params.breakdown.servicePriceCents)}</td>
    </tr>`,
    ...params.breakdown.lines.map(
      (line) => `<tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${escapeHtml(line.name)}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatMoney(line.priceCents)}</td>
      </tr>`,
    ),
  ].join("");

  const expiresLabel = params.expiresAt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const messageBlock = params.messageToCustomer?.trim()
    ? `<p style="margin: 0 0 16px; padding: 12px 14px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
        ${escapeHtml(params.messageToCustomer.trim())}
      </p>`
    : "";

  const body = `
    <h2 style="margin: 0 0 8px; color: #0f2744;">Your cleaning estimate</h2>
    <p style="margin: 0 0 16px;">Hi ${escapeHtml(params.customerName)},</p>
    <p style="margin: 0 0 16px;">
      Here is your personalized estimate from ${escapeHtml(siteConfig.shortName)}.
      Review the details below, then choose a date and complete payment with the secure link.
    </p>
    ${messageBlock}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 8px; font-size: 14px;">
      ${lineRows}
      <tr>
        <td style="padding: 12px 0 0; font-weight: 700; color: #0f2744;">Total</td>
        <td style="padding: 12px 0 0; font-weight: 700; color: #0f2744; text-align: right;">${formatMoney(params.totalAmount)}</td>
      </tr>
    </table>
    <p style="margin: 16px 0 0; font-size: 13px; color: #64748b;">
      This estimate expires on ${escapeHtml(expiresLabel)}.
    </p>
    <p style="margin: 8px 0 0;">
      ${primaryButton(params.payLinkUrl, "Review & pay")}
    </p>
    <p style="margin: 20px 0 0; font-size: 12px; color: #94a3b8;">
      If the button does not work, copy this link:<br />
      <a href="${params.payLinkUrl}" style="color: #0066cc; word-break: break-all;">${escapeHtml(params.payLinkUrl)}</a>
    </p>
  `;

  return {
    subject: `Your ${siteConfig.shortName} estimate — ${params.serviceName}`,
    html: emailLayout(body, params.appUrl),
  };
}
