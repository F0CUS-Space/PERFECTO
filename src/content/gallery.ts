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

/** Static before/after fallbacks when the DB has no BEFORE_AFTER rows. */
export const beforeAfterPairs: BeforeAfterPair[] = [
  {
    title: "Office Suite Reset",
    category: "Offices",
    before: "/images/gallery/office-before.png",
    after: "/images/gallery/office-after.png",
  },
  {
    title: "Clinic Waiting Room",
    category: "Medical",
    before: "/images/gallery/medical-before.png",
    after: "/images/gallery/medical-after.png",
  },
  {
    title: "Dining Room Ready",
    category: "Hospitality",
    before: "/images/gallery/restaurant-before.png",
    after: "/images/gallery/restaurant-after.png",
  },
];

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
