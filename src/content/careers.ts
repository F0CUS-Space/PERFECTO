export interface JobOpening {
  title: string;
  type: string;
  location: string;
  summary: string;
}

export const jobOpenings: JobOpening[] = [
  {
    title: "Residential Cleaning Professional",
    type: "Full-time / Part-time",
    location: "Local",
    summary:
      "Deliver meticulous residential cleans, represent the Perfecto standard, and build lasting trust with our clients.",
  },
  {
    title: "Deep Cleaning Specialist",
    type: "Full-time",
    location: "Local",
    summary:
      "Tackle detailed, top-to-bottom restorations with an eye for the spots others miss.",
  },
  {
    title: "Team Lead — Operations",
    type: "Full-time",
    location: "Local",
    summary:
      "Coordinate schedules, mentor cleaning professionals, and ensure every job meets our quality bar.",
  },
];

export const careerPerks = [
  "Competitive pay and tips",
  "Flexible scheduling",
  "Paid training and growth",
  "Supportive, respectful team",
  "All supplies and equipment provided",
];
