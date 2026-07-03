export const ADMIN_STATS_PERIODS = ["24h", "7d", "30d", "365d"] as const;
export type AdminStatsPeriod = (typeof ADMIN_STATS_PERIODS)[number];

export interface PeriodRange {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
}

export interface PeriodLabels {
  short: string;
  comparison: string;
}

export function parseAdminStatsPeriod(value: string | undefined): AdminStatsPeriod {
  if (value === "7d" || value === "30d" || value === "365d") return value;
  return "24h";
}

export function getPeriodLabels(period: AdminStatsPeriod): PeriodLabels {
  switch (period) {
    case "24h":
      return { short: "Today", comparison: "vs yesterday" };
    case "7d":
      return { short: "Last 7 days", comparison: "vs prior 7 days" };
    case "30d":
      return { short: "Last 30 days", comparison: "vs prior 30 days" };
    case "365d":
      return { short: "Last 12 months", comparison: "vs prior 12 months" };
  }
}

export function getPeriodRange(period: AdminStatsPeriod, now = new Date()): PeriodRange {
  if (period === "24h") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - 1);

    const previousEnd = new Date(now);
    previousEnd.setDate(previousEnd.getDate() - 1);

    return { start, end: now, previousStart, previousEnd };
  }

  const end = now;
  const start = new Date(now);
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 365;
  start.setDate(start.getDate() - days);

  const previousEnd = new Date(start);
  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - days);

  return { start, end, previousStart, previousEnd };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return null;
    return 100;
  }
  return ((current - previous) / previous) * 100;
}

export function formatPercentChange(value: number | null): string {
  if (value === null) return "No change";
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return "No change";
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}
