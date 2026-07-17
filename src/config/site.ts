export const siteConfig = {
  name: "Perfecto Cleaning Services",
  shortName: "Perfecto",
  tagline: "Clean spaces. Perfect results.",
  description:
    "Premium commercial and facility cleaning for offices, schools, clinics, municipal buildings, and hospitality venues.",
  contact: {
    phone: "(703) 231-6088",
    /** E.164 for tel: links */
    phoneE164: "+17032316088",
    email: "inf0@perfectodmv.com",
    hours: "Mon–Sat, 8:00 AM – 6:00 PM",
  },
  social: {
    instagram: "https://instagram.com/perfectocleanings",
    facebook: "https://facebook.com",
    x: "https://x.com",
  },
} as const;

export type SiteConfig = typeof siteConfig;
