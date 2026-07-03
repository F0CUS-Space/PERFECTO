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
