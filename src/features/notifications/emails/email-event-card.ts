import { escapeHtml } from "@/lib/escape-html";
import {
  buildGoogleCalendarUrl,
  buildGoogleMapsDirectionsUrl,
  formatEmailEventDateTimeRange,
} from "@/lib/calendar-event";

const CARD = {
  border: "#e2e8f0",
  bg: "#f8fafc",
  navy: "#0f2744",
  blue: "#1a73e8",
  muted: "#64748b",
};

export type EmailEventCardParams = {
  title: string;
  scheduledDate: Date;
  arrivalWindow: string;
  location: string;
  calendarDetails: string;
};

/** Gmail-style event summary card for transactional emails. */
export function buildEmailEventCard(params: EmailEventCardParams): string {
  const when = escapeHtml(
    formatEmailEventDateTimeRange(params.scheduledDate, params.arrivalWindow),
  );
  const title = escapeHtml(params.title);
  const location = escapeHtml(params.location);
  const month = params.scheduledDate
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();
  const day = params.scheduledDate.getDate();

  const calendarUrl = escapeHtml(
    buildGoogleCalendarUrl({
      title: params.title,
      scheduledDate: params.scheduledDate,
      arrivalWindow: params.arrivalWindow,
      location: params.location,
      details: params.calendarDetails,
    }),
  );
  const directionsUrl = escapeHtml(buildGoogleMapsDirectionsUrl(params.location));

  return `
    <div style="margin: 20px 0; border: 1px solid ${CARD.border}; border-radius: 14px; overflow: hidden; background: ${CARD.bg};">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 18px 16px 12px; vertical-align: top;">
            <p style="margin: 0 0 6px; font-size: 15px; font-weight: 700; color: ${CARD.navy};">${when}</p>
            <p style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: ${CARD.navy};">${title}</p>
            <p style="margin: 0; font-size: 14px; color: ${CARD.muted}; line-height: 1.5;">
              📍 ${location}
            </p>
          </td>
          <td style="padding: 18px 16px 12px 0; width: 64px; vertical-align: top;">
            <div style="width: 52px; border-radius: 10px; overflow: hidden; border: 1px solid ${CARD.border}; background: #ffffff; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">
              <div style="background: ${CARD.blue}; color: #ffffff; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; padding: 4px 0;">${escapeHtml(month)}</div>
              <div style="font-size: 22px; font-weight: 700; color: ${CARD.navy}; padding: 6px 0 8px; line-height: 1;">${day}</div>
            </div>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 0 16px 16px;">
            <a href="${calendarUrl}" style="display: inline-block; margin-right: 10px; padding: 10px 16px; background: ${CARD.navy}; color: #ffffff; text-decoration: none; border-radius: 999px; font-size: 14px; font-weight: 600;">Add to Calendar</a>
            <a href="${directionsUrl}" style="display: inline-block; padding: 10px 16px; background: #ffffff; color: ${CARD.blue}; text-decoration: none; border-radius: 999px; font-size: 14px; font-weight: 600; border: 1px solid ${CARD.border};">Directions</a>
          </td>
        </tr>
      </table>
    </div>
  `;
}
