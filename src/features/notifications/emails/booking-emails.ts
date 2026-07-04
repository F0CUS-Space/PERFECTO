import { siteConfig } from "@/config/site";
import { escapeHtml } from "@/lib/escape-html";
import { displayArrivalTime } from "@/lib/format-arrival-time";
import { buildEventReservationJsonLd } from "@/lib/calendar-event";

import { buildEmailEventCard } from "./email-event-card";

const BRAND = {
  navy: "#0f2744",
  blue: "#0066cc",
  green: "#22a06b",
  light: "#f8fafc",
};

function brandAssetUrl(appUrl: string, file: string): string {
  return `${appUrl.replace(/\/$/, "")}/brand/${file}`;
}

export function emailLayout(
  body: string,
  appUrl: string,
  jsonLd?: Record<string, unknown>,
): string {
  const iconUrl = brandAssetUrl(appUrl, "perfecto-icon.png");
  const wordmarkUrl = brandAssetUrl(appUrl, "perfecto-wordmark.png");
  const structuredData =
    jsonLd !== undefined
      ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`
      : "";

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: ${BRAND.light}; padding: 24px;">
      <div style="background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: ${BRAND.navy}; padding: 28px 24px; text-align: center;">
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; background: #ffffff; border-radius: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.15);">
            <tr>
              <td style="padding: 14px 0 14px 18px; vertical-align: middle;">
                <img src="${iconUrl}" alt="" width="52" height="52" style="display: block; width: 52px; height: 52px;" />
              </td>
              <td style="padding: 14px 18px 14px 10px; vertical-align: middle;">
                <img src="${wordmarkUrl}" alt="${escapeHtml(siteConfig.name)}" width="170" style="display: block; max-width: 170px; height: auto;" />
              </td>
            </tr>
          </table>
        </div>
        <div style="padding: 28px 24px; color: #334155; line-height: 1.6;">
          ${structuredData}
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

export function primaryButton(href: string, label: string): string {
  return `<a href="${href}" style="display: inline-block; margin-top: 16px; padding: 12px 20px; background: ${BRAND.blue}; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;">${escapeHtml(label)}</a>`;
}

export function outlineButton(href: string, label: string): string {
  return `<a href="${href}" style="display: inline-block; margin-top: 12px; margin-left: 8px; padding: 12px 20px; background: #ffffff; color: ${BRAND.blue}; text-decoration: none; border-radius: 10px; font-weight: 600; border: 1px solid ${BRAND.blue};">${escapeHtml(label)}</a>`;
}

export function bookingConfirmationEmail(params: {
  customerName: string;
  customerEmail?: string | null;
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
  const bookingUrl = `${params.appUrl.replace(/\/$/, "")}/dashboard/bookings/${params.bookingId}`;
  const eventTitle = `${params.serviceName} — Perfecto`;
  const calendarDetails = `Your Perfecto cleaning appointment.\nAddress: ${location}\nArrival: ${displayArrivalTime(params.arrivalWindow)}`;

  const invoiceLine = params.invoiceNumber
    ? `<tr><td style="padding: 6px 0; color: #64748b;">Invoice</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(params.invoiceNumber)}</td></tr>`
    : "";

  const invoiceNote = params.invoiceNumber
    ? `<p style="margin: 16px 0 0; padding: 12px 14px; background: ${BRAND.light}; border-radius: 10px; font-size: 14px;">
        Your invoice <strong>${escapeHtml(params.invoiceNumber)}</strong> is ready.
        Download the PDF anytime from your
        <a href="${bookingUrl}" style="color: ${BRAND.blue}; font-weight: 600;">booking dashboard</a>.
      </p>`
    : "";

  const eventCard = buildEmailEventCard({
    title: eventTitle,
    scheduledDate: params.scheduledDate,
    arrivalWindow: params.arrivalWindow,
    location,
    calendarDetails,
  });

  const jsonLd = buildEventReservationJsonLd({
    reservationNumber: params.invoiceNumber ?? params.bookingId.slice(0, 8).toUpperCase(),
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    eventName: eventTitle,
    scheduledDate: params.scheduledDate,
    arrivalWindow: params.arrivalWindow,
    addressLine: params.addressLine,
    city: params.city,
    postalCode: params.postalCode,
    bookingUrl,
    description: calendarDetails,
  });

  return {
    subject: `Booking confirmed — ${params.serviceName}`,
    html: emailLayout(
      `
      <p style="font-size: 16px; color: ${BRAND.navy}; font-weight: 600;">Hi ${name}, your booking is confirmed!</p>
      <p>Thank you for choosing Perfecto. Here are your appointment details:</p>
      ${eventCard}
      <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #64748b;">Service</td><td style="padding: 6px 0; font-weight: 600;">${service}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Date</td><td style="padding: 6px 0; font-weight: 600;">${date}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Arrival time</td><td style="padding: 6px 0; font-weight: 600;">${arrival}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Address</td><td style="padding: 6px 0; font-weight: 600;">${address}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Total</td><td style="padding: 6px 0; font-weight: 600;">${total}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Paid</td><td style="padding: 6px 0; font-weight: 600; color: ${BRAND.green};">${amountPaid}</td></tr>
        ${invoiceLine}
      </table>
      ${invoiceNote}
      ${outlineButton(bookingUrl, "View in dashboard")}
      <p style="margin-top: 24px;">We look forward to serving you.<br/>— The Perfecto Team</p>
    `,
      params.appUrl,
      jsonLd,
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
