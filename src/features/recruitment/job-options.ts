export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Full-time / Part-time",
  "Contract",
  "Seasonal",
] as const;

export const JOB_LOCATIONS = ["Local", "Remote", "Hybrid"] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type JobLocation = (typeof JOB_LOCATIONS)[number];

export function isEmploymentType(value: string): value is EmploymentType {
  return (EMPLOYMENT_TYPES as readonly string[]).includes(value);
}

export function isJobLocation(value: string): value is JobLocation {
  return (JOB_LOCATIONS as readonly string[]).includes(value);
}
