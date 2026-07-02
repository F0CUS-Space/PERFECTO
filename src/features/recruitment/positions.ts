import { jobOpenings } from "@/content/careers";

import type { JobPostingRow } from "./queries";

/** Pick the best-matching active job title for apply-form defaults. */
export function resolveJobPosition(input: string | undefined, jobs: JobPostingRow[]): string {
  if (!jobs.length) {
    return "";
  }

  if (!input?.trim()) {
    return jobs[0]?.title ?? "";
  }

  const normalized = input.trim().toLowerCase();
  const match = jobs.find((job) => job.title.toLowerCase() === normalized);
  return match?.title ?? jobs[0]?.title ?? "";
}

/** Fallback titles when the database is unavailable (local dev without Postgres). */
export function fallbackJobTitles(): string[] {
  return jobOpenings.map((job) => job.title);
}

export function fallbackJobPostings(): JobPostingRow[] {
  return jobOpenings.map((job, index) => ({
    id: `fallback-${index}`,
    slug: job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: job.title,
    type: job.type,
    location: job.location,
    summary: job.summary,
    isActive: true,
    sortOrder: index + 1,
  }));
}
