import { siteConfig } from "@/config/site";
import { escapeHtml } from "@/lib/escape-html";

/** Shared wrapper for transactional HTML emails. */
export function emailLayout(body: string): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b; line-height: 1.5;">
      <p style="font-size: 18px; font-weight: 600; color: #0066cc; margin-bottom: 24px;">
        ${escapeHtml(siteConfig.name)}
      </p>
      ${body}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
      <p style="font-size: 12px; color: #64748b; margin: 0;">
        ${escapeHtml(siteConfig.contact.phone)} · ${escapeHtml(siteConfig.contact.email)}
      </p>
    </div>
  `;
}

function dashboardBookingUrl(bookingId: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/dashboard/bookings/${bookingId}`;
}

export function bookingConfirmationEmail(params: {
  customerName: string;
  serviceName: string;
  scheduledDate: string;
  arrivalWindow: string;
  addressLine: string;
  city: string;
  postalCode: string;
  amountPaid: number;
  totalAmount: number;
  invoiceNumber: string | null;
  bookingId: string;
  appUrl: string;
}) {
  const name = escapeHtml(params.customerName);
  const service = escapeHtml(params.serviceName);
  const date = escapeHtml(params.scheduledDate);
  const window = escapeHtml(params.arrivalWindow);
  const address = escapeHtml(
    `${params.addressLine}, ${params.city} ${params.postalCode}`,
  );
  const amountPaid = escapeHtml(formatMoney(params.amountPaid));
  const total = escapeHtml(formatMoney(params.totalAmount));
  const invoiceLine = params.invoiceNumber
    ? `<p><strong>Invoice:</strong> ${escapeHtml(params.invoiceNumber)}</p>`
    : "";
  const bookingUrl = dashboardBookingUrl(params.bookingId, params.appUrl);

  return {
    subject: `Booking confirmed — ${params.serviceName}`,
    html: emailLayout(`
      <p>Hi ${name},</p>
      <p>Your cleaning is confirmed. Here are the details:</p>
      <ul style="padding-left: 20px;">
        <li><strong>Service:</strong> ${service}</li>
        <li><strong>Date:</strong> ${date}</li>
        <li><strong>Arrival window:</strong> ${window}</li>
        <li><strong>Address:</strong> ${address}</li>
        <li><strong>Total:</strong> ${total}</li>
        <li><strong>Paid:</strong> ${amountPaid}</li>
      </ul>
      ${invoiceLine}
      <p style="margin-top: 20px;">
        <a href="${bookingUrl}" style="color: #0066cc;">View booking in your dashboard</a>
      </p>
      <p>We look forward to serving you.</p>
      <p>— The Perfecto Team</p>
    `),
  };
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
