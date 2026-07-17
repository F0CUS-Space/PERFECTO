export interface FaqItem {
  question: string;
  answer: string;
}

export const faqs: FaqItem[] = [
  {
    question: "How do I get a price for my facility?",
    answer:
      "Request an estimate from our contact page. Tell us your facility type, approximate square footage, visit frequency, and any add-ons (window cleaning, carpet cleaning, disinfection, or a deep clean). Final pricing is confirmed after a quick review or walkthrough.",
  },
  {
    question: "Do I need to pay the full amount upfront?",
    answer:
      "No. To confirm a booking we collect full payment upfront. You'll always see the total clearly before you pay.",
  },
  {
    question: "Are your cleaners insured and vetted?",
    answer:
      "Absolutely. Every Perfecto professional undergoes a rigorous background check and training, and all work is covered by comprehensive bonding and insurance for your peace of mind.",
  },
  {
    question: "What cleaning products do you use?",
    answer:
      "We use premium, eco-friendly, non-toxic products that are safe for children, pets, and the environment. If you have specific product preferences or sensitivities, let us know in your booking notes.",
  },
  {
    question: "Do you bring your own supplies and equipment?",
    answer:
      "Yes. Our professionals arrive fully equipped with all the supplies and equipment needed to deliver a perfect clean. There's nothing you need to provide.",
  },
  {
    question: "How do I provide access to my building?",
    answer:
      "During booking you can add access information — for example a door code, key location, or after-hours entry instructions. Your details are stored securely and only shared with your assigned team.",
  },
  {
    question: "Can I reschedule or cancel my appointment?",
    answer:
      "Yes. Please review our Cancellation Policy for timing and any applicable fees. We're committed to being flexible while respecting our professionals' time.",
  },
  {
    question: "What if I'm not satisfied with the clean?",
    answer:
      "Your satisfaction is guaranteed. If something isn't right, contact us within 24 hours and we'll make it right — promptly and at no extra cost.",
  },
];
