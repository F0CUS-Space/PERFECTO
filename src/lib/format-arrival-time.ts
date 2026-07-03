/** Format 24h HH:MM for display (e.g. "09:30" → "9:30 AM"). */
export function formatArrivalTime(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return value;

  const hours = Number(match[1]);
  const minutes = match[2];
  if (hours < 0 || hours > 23) return value;

  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}

/** Label for UI — handles legacy preset strings and HH:MM values. */
export function displayArrivalTime(value: string): string {
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    return formatArrivalTime(value);
  }
  return value;
}
