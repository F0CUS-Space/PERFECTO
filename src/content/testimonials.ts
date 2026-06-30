export interface Testimonial {
  name: string;
  location: string;
  rating: number;
  quote: string;
}

// Static testimonials for V1.0. A customer-driven review system arrives in V1.5.
export const testimonials: Testimonial[] = [
  {
    name: "Sarah M.",
    location: "Downtown",
    rating: 5,
    quote:
      "Perfecto transformed my apartment. The team was professional, punctual, and incredibly thorough. Booking online took two minutes and the deposit system felt secure and clear.",
  },
  {
    name: "James & Elena R.",
    location: "Riverside",
    rating: 5,
    quote:
      "We've tried several cleaning services and none compare. Our recurring plan means our home is always guest-ready. Worth every penny.",
  },
  {
    name: "Michael T.",
    location: "Westgate",
    rating: 5,
    quote:
      "Used the move-out clean for my rental and got my full deposit back. The before-and-after was night and day. Highly recommend.",
  },
  {
    name: "Priya K.",
    location: "Northside",
    rating: 5,
    quote:
      "Eco-friendly products were a must with my kids and pets. Perfecto delivered a spotless home without harsh chemical smells. Fantastic experience.",
  },
  {
    name: "David L.",
    location: "Old Town",
    rating: 5,
    quote:
      "The deep clean exceeded expectations — baseboards, grout, inside the oven, everything. Communication was excellent from quote to completion.",
  },
  {
    name: "Aisha N.",
    location: "Lakeview",
    rating: 5,
    quote:
      "Our office has never looked better. Reliable, discreet, and detail-obsessed. The team genuinely cares about quality.",
  },
];
