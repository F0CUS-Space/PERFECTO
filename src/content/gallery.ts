export interface BeforeAfterPair {
  title: string;
  category: string;
  before: string;
  after: string;
}

export interface GalleryItem {
  title: string;
  category: "Residential" | "Deep Clean" | "Office" | "Move In/Out";
  image: string;
}

export const beforeAfterPairs: BeforeAfterPair[] = [
  {
    title: "Living room reset",
    category: "Residential",
    before: "/images/gallery-living-before.png",
    after: "/images/gallery-living-after.png",
  },
  {
    title: "Kitchen deep clean",
    category: "Deep Clean",
    before: "/images/gallery-kitchen-before.png",
    after: "/images/gallery-kitchen-after.png",
  },
];

export const galleryItems: GalleryItem[] = [
  { title: "Sparkling Living Room", category: "Residential", image: "/images/service-residential.png" },
  { title: "Spotless Kitchen", category: "Deep Clean", image: "/images/service-recurring.png" },
  { title: "Pristine Bath & Kitchen", category: "Deep Clean", image: "/images/service-deep.png" },
  { title: "Move-Out Ready", category: "Move In/Out", image: "/images/service-move.png" },
  { title: "Polished Office", category: "Office", image: "/images/service-office.png" },
  { title: "Luxury Living", category: "Residential", image: "/images/hero-living-room.png" },
];
