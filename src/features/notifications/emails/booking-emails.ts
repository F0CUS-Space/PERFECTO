import { siteConfig } from "@/config/site";
import { escapeHtml } from "@/lib/escape-html";
import { displayArrivalTime } from "@/lib/format-arrival-time";
import { buildGoogleCalendarUrl } from "@/lib/calendar-event";

const BRAND = {
  navy: "#0f2744",
  blue: "#0066cc",
  green: "#22a06b",
  light: "#f8fafc",
};

export function emailLayout(body: string, appUrl: string): string {
  const logoUrl = `${appUrl.replace(/\/$/, "")}/brand/perfecto-wordmark.png`;

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: ${BRAND.light}; padding: 24px;">
      <div style="background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: ${BRAND.navy}; padding: 24px; text-align: center;">
          <img src="${logoUrl}" alt="${escapeHtml(siteConfig.name)}" width="180" style="max-width: 180px; height: auto;" />
        </div>
        <div style="padding: 28px 24px; color: #334155; line-height: 1.6;">
          ${body}
        </div>
        <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b;">
          ${escapeHtml(siteConfig.contact.phone)} · ${escapeHtml(siteConfig.contact.email)}
        </div>
      </div>
    </div>
  `;
}

function dashboardBookingUrl(bookingId: string, appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/dashboard/bookings/${bookingId}?review=1`;
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function primaryButton(href: string, label: string): string {
  return `<a href="${href}" style="display: inline-block; margin-top: 16px; padding: 12px 20px; background: ${BRAND.blue}; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;">${escapeHtml(label)}</a>`;
}

function outlineButton(href: string, label: string): string {
  return `<a href="${href}" style="display: inline-block; margin-top: 12px; margin-left: 8px; padding: 12px 20px; background: #ffffff; color: ${BRAND.blue}; text-decoration: none; border-radius: 10px; font-weight: 600; border: 1px solid ${BRAND.blue};">${escapeHtml(label)}</a>`;
}

export function bookingConfirmationEmail(params: {
  customerName: string;
  serviceName: string;
  scheduledDate: Date;
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
  const date = escapeHtml(
    params.scheduledDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  );
  const arrival = escapeHtml(displayArrivalTime(params.arrivalWindow));
  const address = escapeHtml(`${params.addressLine}, ${params.city} ${params.postalCode}`);
  const location = `${params.addressLine}, ${params.city} ${params.postalCode}`;
  const amountPaid = escapeHtml(formatMoney(params.amountPaid));
  const total = escapeHtml(formatMoney(params.totalAmount));
  const invoiceLine = params.invoiceNumber
    ? `<tr><td style="padding: 6px 0; color: #64748b;">Invoice</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(params.invoiceNumber)}</td></tr>`
    : "";

  const calendarUrl = buildGoogleCalendarUrl({
    title: `${params.serviceName} — Perfecto`,
    scheduledDate: params.scheduledDate,
    arrivalWindow: params.arrivalWindow,
    location,
    details: `Your Perfecto cleaning appointment.\nAddress: ${location}\nArrival: ${displayArrivalTime(params.arrivalWindow)}`,
  });

  const bookingUrl = `${params.appUrl.replace(/\/$/, "")}/dashboard/bookings/${params.bookingId}`;

  return {
    subject: `Booking confirmed — ${params.serviceName}`,
    html: emailLayout(
      `
      <p style="font-size: 16px; color: ${BRAND.navy}; font-weight: 600;">Hi ${name}, your booking is confirmed!</p>
      <p>Thank you for choosing Perfecto. Here are your appointment details:</p>
      <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #64748b;">Service</td><td style="padding: 6px 0; font-weight: 600;">${service}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Date</td><td style="padding: 6px 0; font-weight: 600;">${date}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Arrival time</td><td style="padding: 6px 0; font-weight: 600;">${arrival}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Address</td><td style="padding: 6px 0; font-weight: 600;">${address}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Total</td><td style="padding: 6px 0; font-weight: 600;">${total}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Paid</td><td style="padding: 6px 0; font-weight: 600; color: ${BRAND.green};">${amountPaid}</td></tr>
        ${invoiceLine}
      </table>
      <p>Add this appointment to your calendar:</p>
      ${primaryButton(calendarUrl, "Add to Google Calendar")}
      ${outlineButton(bookingUrl, "View in dashboard")}
      <p style="margin-top: 24px;">We look forward to serving you.<br/>— The Perfecto Team</p>
    `,
      params.appUrl,
    ),
  };
}

export function bookingCompletionEmail(params: {
  customerName: string;
  serviceName: string;
  bookingId: string;
  appUrl: string;
}) {
  const name = escapeHtml(params.customerName);
  const service = escapeHtml(params.serviceName);
  const reviewUrl = dashboardBookingUrl(params.bookingId, params.appUrl);

  return {
    subject: `Thank you — how was your ${params.serviceName}?`,
    html: emailLayout(
      `
      <p style="font-size: 16px; color: ${BRAND.navy}; font-weight: 600;">Hi ${name},</p>
      <p>Our team has finished your <strong>${service}</strong> service. We hope your space feels refreshed!</p>
      <p>We'd love to hear how we did. Your feedback helps us improve and helps other customers choose Perfecto.</p>
      ${primaryButton(reviewUrl, "Leave a rating & review")}
      <p style="margin-top: 24px;">Thank you for trusting Perfecto.<br/>— The Perfecto Team</p>
    `,
      params.appUrl,
    ),
  };
}
