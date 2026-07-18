export interface BeforeAfterPair {
  title: string;
  category: string;
  before: string;
  after: string;
}

export interface GalleryItem {
  title: string;
  category: "Offices" | "Schools" | "Government" | "Medical" | "Hospitality";
  image: string;
}

/** Static before/after fallbacks — empty until real facility pairs are uploaded via admin (S3). */
export const beforeAfterPairs: BeforeAfterPair[] = [];

export const galleryItems: GalleryItem[] = [
  {
    title: "Polished Office Suite",
    category: "Offices",
    image: "/images/services/offices.webp",
  },
  {
    title: "School Corridor Ready",
    category: "Schools",
    image: "/images/services/schools-daycares.webp",
  },
  {
    title: "Municipal Lobby Shine",
    category: "Government",
    image: "/images/services/government-municipal.webp",
  },
  {
    title: "Clinic Waiting Room Reset",
    category: "Medical",
    image: "/images/services/medical-dental.webp",
  },
  {
    title: "Guest-Ready Dining Room",
    category: "Hospitality",
    image: "/images/services/restaurants-nightlife.webp",
  },
];
