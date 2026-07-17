export const siteConfig = {
  name: "Perfecto Cleaning Services",
  shortName: "Perfecto",
  tagline: "Clean spaces. Perfect results.",
  description:
    "Premium commercial and facility cleaning for offices, schools, clinics, municipal buildings, and hospitality venues.",
  // Update these with the real business details before launch.
  contact: {
    phone: "+1 (555) 010-0000",
    email: "hello@perfectocleaning.com",
    address: "123 Sparkle Avenue, Suite 100, Your City, ST 00000",
    hours: "Mon–Sat, 8:00 AM – 6:00 PM",
  },
  social: {
    instagram: "https://instagram.com",
    facebook: "https://facebook.com",
    x: "https://x.com",
  },
} as const;

export type SiteConfig = typeof siteConfig;
