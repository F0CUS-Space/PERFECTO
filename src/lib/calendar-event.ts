/** Build Google Calendar event URL and ICS content for a booking. */

function parseArrivalHoursMinutes(arrivalWindow: string): { hours: number; minutes: number } {
  const hhmm = arrivalWindow.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    return { hours: Number(hhmm[1]), minutes: Number(hhmm[2]) };
  }

  const ampm = arrivalWindow.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampm) {
    let hours = Number(ampm[1]) % 12;
    if (ampm[3].toUpperCase() === "PM") hours += 12;
    return { hours, minutes: Number(ampm[2]) };
  }

  return { hours: 9, minutes: 0 };
}

function toGoogleDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function eventStartEnd(scheduledDate: Date, arrivalWindow: string, durationHours = 3) {
  const { hours, minutes } = parseArrivalHoursMinutes(arrivalWindow);
  const start = new Date(scheduledDate);
  start.setHours(hours, minutes, 0, 0);
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  return { start, end };
}

/** Local ISO-8601 datetime for Schema.org markup in emails. */
export function toLocalIsoDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const tz = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${tz}`
  );
}

export function getBookingEventWindow(
  scheduledDate: Date,
  arrivalWindow: string,
  durationHours = 3,
) {
  return eventStartEnd(scheduledDate, arrivalWindow, durationHours);
}

export function formatEmailEventDateTimeRange(
  scheduledDate: Date,
  arrivalWindow: string,
  durationHours = 3,
): string {
  const { start, end } = eventStartEnd(scheduledDate, arrivalWindow, durationHours);
  const day = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startTime = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${startTime} – ${endTime}`;
}

export function buildGoogleMapsDirectionsUrl(location: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`;
}

export function buildEventReservationJsonLd(params: {
  reservationNumber: string;
  customerName: string;
  customerEmail?: string | null;
  eventName: string;
  scheduledDate: Date;
  arrivalWindow: string;
  addressLine: string;
  city: string;
  postalCode: string;
  bookingUrl: string;
  description?: string;
}) {
  const { start, end } = eventStartEnd(params.scheduledDate, params.arrivalWindow);

  return {
    "@context": "http://schema.org",
    "@type": "EventReservation",
    reservationNumber: params.reservationNumber,
    reservationStatus: "http://schema.org/Confirmed",
    url: params.bookingUrl,
    underName: {
      "@type": "Person",
      name: params.customerName,
      ...(params.customerEmail ? { email: params.customerEmail } : {}),
    },
    reservationFor: {
      "@type": "Event",
      name: params.eventName,
      startDate: toLocalIsoDateTime(start),
      endDate: toLocalIsoDateTime(end),
      ...(params.description ? { description: params.description } : {}),
      location: {
        "@type": "Place",
        name: params.addressLine,
        address: {
          "@type": "PostalAddress",
          streetAddress: params.addressLine,
          addressLocality: params.city,
          postalCode: params.postalCode,
          addressCountry: "US",
        },
      },
    },
  };
}

export function buildGoogleCalendarUrl(params: {
  title: string;
  scheduledDate: Date;
  arrivalWindow: string;
  location: string;
  details: string;
}): string {
  const { start, end } = eventStartEnd(params.scheduledDate, params.arrivalWindow);
  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
    location: params.location,
    details: params.details,
  });
  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

export function buildBookingIcs(params: {
  uid: string;
  title: string;
  scheduledDate: Date;
  arrivalWindow: string;
  location: string;
  description: string;
}): string {
  const { start, end } = eventStartEnd(params.scheduledDate, params.arrivalWindow);
  const stamp = toGoogleDate(new Date());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Perfecto Cleaning Services//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${params.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toGoogleDate(start)}`,
    `DTEND:${toGoogleDate(end)}`,
    `SUMMARY:${params.title.replace(/\n/g, " ")}`,
    `LOCATION:${params.location.replace(/\n/g, " ")}`,
    `DESCRIPTION:${params.description.replace(/\n/g, "\\n")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
