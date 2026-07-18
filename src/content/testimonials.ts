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
    location: "Municipal Facilities",
    rating: 5,
    quote:
      "Perfecto keeps our public lobby and offices looking professional after every visit. The estimate process was clear, and the team works quietly around our schedule.",
  },
  {
    name: "James & Elena R.",
    location: "Professional Offices",
    rating: 5,
    quote:
      "We've tried several commercial cleaners and none compare. Nightly service means our suite is always client-ready. Reliable and detail-obsessed.",
  },
  {
    name: "Michael T.",
    location: "School Campus",
    rating: 5,
    quote:
      "Our classrooms and restrooms stay consistently clean between terms. Communication from estimate to completion was excellent.",
  },
  {
    name: "Priya K.",
    location: "Dental Practice",
    rating: 5,
    quote:
      "Eco-friendly products were important for our waiting room and treatment-adjacent areas. Perfecto delivered a spotless clinic without harsh chemical smells.",
  },
  {
    name: "David L.",
    location: "Restaurant Group",
    rating: 5,
    quote:
      "After-hours resets for dining rooms and guest restrooms exceeded expectations. Floor care and high-touch disinfection make a visible difference.",
  },
  {
    name: "Aisha N.",
    location: "Co-Working Hub",
    rating: 5,
    quote:
      "Our office has never looked better. Discreet, reliable, and genuinely focused on quality. Easy to request estimates when we add floors.",
  },
];
