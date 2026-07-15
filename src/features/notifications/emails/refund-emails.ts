import { escapeHtml } from "@/lib/escape-html";

import { emailLayout, outlineButton } from "./booking-emails";

const BRAND = {
  navy: "#0f2744",
  green: "#22a06b",
  light: "#f8fafc",
};

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function refundIssuedEmail(params: {
  customerName: string;
  serviceName: string;
  refundedCents: number;
  bookingId: string;
  appUrl: string;
}) {
  const name = escapeHtml(params.customerName);
  const service = escapeHtml(params.serviceName);
  const amount = escapeHtml(formatMoney(params.refundedCents));
  const bookingUrl = `${params.appUrl.replace(/\/$/, "")}/dashboard/bookings/${params.bookingId}`;

  return {
    subject: `Refund issued — ${params.serviceName}`,
    html: emailLayout(
      `
      <p style="font-size: 16px; color: ${BRAND.navy}; font-weight: 600;">Hi ${name},</p>
      <p>We've issued a refund for your <strong>${service}</strong> booking.</p>
      <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Refund amount</td>
          <td style="padding: 6px 0; font-weight: 600; color: ${BRAND.green};">${amount}</td>
        </tr>
      </table>
      <p style="margin: 0 0 8px; padding: 12px 14px; background: ${BRAND.light}; border-radius: 10px; font-size: 14px;">
        Refunds are returned to your original payment method and typically appear within 5–10 business days,
        depending on your bank or card provider.
      </p>
      ${outlineButton(bookingUrl, "View in dashboard")}
      <p style="margin-top: 24px;">If you have any questions, just reply to this email.<br/>— The Perfecto Team</p>
    `,
      params.appUrl,
    ),
  };
}
