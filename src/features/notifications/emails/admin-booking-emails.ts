import { escapeHtml } from "@/lib/escape-html";
import { displayArrivalTime } from "@/lib/format-arrival-time";

import { emailLayout } from "./booking-emails";

function adminBookingUrl(bookingId: string, appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/admin/bookings/${bookingId}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function adminNewBookingEmail(params: {
  customerName: string;
  serviceName: string;
  scheduledDate: Date;
  arrivalWindow: string;
  bookingId: string;
  appUrl: string;
}) {
  const subject = `New booking — ${params.serviceName}`;
  const html = emailLayout(
    `
      <h1 style="margin: 0 0 12px; font-size: 22px; color: #0f2744;">New booking confirmed</h1>
      <p style="margin: 0 0 16px;">${escapeHtml(params.customerName)} booked <strong>${escapeHtml(params.serviceName)}</strong>.</p>
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #64748b;">Date</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(formatDate(params.scheduledDate))}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Arrival</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(displayArrivalTime(params.arrivalWindow))}</td></tr>
      </table>
      <a href="${adminBookingUrl(params.bookingId, params.appUrl)}" style="display: inline-block; margin-top: 16px; padding: 12px 20px; background: #0066cc; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;">View booking</a>
    `,
    params.appUrl,
  );
  return { subject, html };
}

export function adminBookingCancelledEmail(params: {
  customerName: string;
  serviceName: string;
  scheduledDate: Date;
  bookingId: string;
  appUrl: string;
}) {
  const subject = `Booking cancelled — ${params.serviceName}`;
  const html = emailLayout(
    `
      <h1 style="margin: 0 0 12px; font-size: 22px; color: #0f2744;">Booking cancelled</h1>
      <p style="margin: 0 0 16px;">${escapeHtml(params.customerName)} cancelled <strong>${escapeHtml(params.serviceName)}</strong> scheduled for ${escapeHtml(formatDate(params.scheduledDate))}.</p>
      <a href="${adminBookingUrl(params.bookingId, params.appUrl)}" style="display: inline-block; margin-top: 16px; padding: 12px 20px; background: #0066cc; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;">View booking</a>
    `,
    params.appUrl,
  );
  return { subject, html };
}

export function adminBookingRescheduledEmail(params: {
  customerName: string;
  serviceName: string;
  previousDate: Date;
  previousArrivalWindow: string;
  scheduledDate: Date;
  arrivalWindow: string;
  bookingId: string;
  appUrl: string;
}) {
  const subject = `Booking rescheduled — ${params.serviceName}`;
  const html = emailLayout(
    `
      <h1 style="margin: 0 0 12px; font-size: 22px; color: #0f2744;">Booking rescheduled</h1>
      <p style="margin: 0 0 16px;">${escapeHtml(params.customerName)} rescheduled <strong>${escapeHtml(params.serviceName)}</strong>.</p>
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #64748b;">From</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(formatDate(params.previousDate))} · ${escapeHtml(displayArrivalTime(params.previousArrivalWindow))}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">To</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(formatDate(params.scheduledDate))} · ${escapeHtml(displayArrivalTime(params.arrivalWindow))}</td></tr>
      </table>
      <a href="${adminBookingUrl(params.bookingId, params.appUrl)}" style="display: inline-block; margin-top: 16px; padding: 12px 20px; background: #0066cc; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;">View booking</a>
    `,
    params.appUrl,
  );
  return { subject, html };
}
