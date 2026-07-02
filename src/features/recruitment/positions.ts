import type { JobPostingRow } from "./queries";

/** Pick the best-matching active job title for apply-form defaults. */
export function resolveJobPosition(input: string | undefined, jobs: JobPostingRow[]): string {
  if (!jobs.length) {
    return "";
  }

  if (!input?.trim()) {
    return jobs[0].title;
  }

  const normalized = input.trim().toLowerCase();
  const match = jobs.find((job) => job.title.toLowerCase() === normalized);
  return match?.title ?? jobs[0].title;
}
