import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-ready";

export interface JobPostingRow {
  id: string;
  slug: string;
  title: string;
  type: string;
  location: string;
  compensation: string;
  summary: string;
  isActive: boolean;
  sortOrder: number;
}

export async function getActiveJobPostings(): Promise<JobPostingRow[]> {
  if (!isDatabaseConfigured()) return [];

  const jobs = await prisma.jobPosting.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  return jobs.map(mapJobPosting);
}

export async function getActiveJobPostingTitles(): Promise<string[]> {
  const jobs = await getActiveJobPostings();
  return jobs.map((job) => job.title);
}

function mapJobPosting(job: {
  id: string;
  slug: string;
  title: string;
  type: string;
  location: string;
  compensation: string;
  summary: string;
  isActive: boolean;
  sortOrder: number;
}): JobPostingRow {
  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    type: job.type,
    location: job.location,
    compensation: job.compensation,
    summary: job.summary,
    isActive: job.isActive,
    sortOrder: job.sortOrder,
  };
}
