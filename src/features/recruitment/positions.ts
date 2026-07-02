import { jobOpenings } from "@/content/careers";

export const jobPositionTitles = jobOpenings.map((job) => job.title);

export function resolveJobPosition(input?: string): string {
  if (!input?.trim()) {
    return jobOpenings[0]?.title ?? "";
  }

  const normalized = input.trim().toLowerCase();
  const match = jobOpenings.find((job) => job.title.toLowerCase() === normalized);
  return match?.title ?? jobOpenings[0]?.title ?? "";
}
