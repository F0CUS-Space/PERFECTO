// Legal policy templates for Version 1.0. These are starting-point drafts and
// MUST be reviewed and approved by qualified legal counsel before launch.

export interface LegalSection {
  heading: string;
  body?: string[];
  // Optional bulleted list rendered under the paragraphs.
  list?: string[];
}

export interface LegalDocument {
  slug: string;
  title: string;
  summary: string;
  sections: LegalSection[];
}

const company = "Perfecto Cleaning Services";
const jurisdictions =
  "the Commonwealth of Virginia, the State of Maryland, and the District of Columbia (Washington, D.C.)";

export const legalDocuments: Record<string, LegalDocument> = {
  agreement: {
    slug: "agreement",
    title: "Cleaning Service Agreement",
    summary: `The master agreement between you and ${company}, covering consent, governing law, and your acknowledgment.`,
    sections: [
      {
        heading: "1. Overview",
        body: [
          `This Cleaning Service Agreement ("Agreement") sets out the terms under which ${company} provides cleaning services to you ("Customer"). It incorporates by reference our Booking Terms, Cleaning Scope & Limitations, Payment Policy, Cancellation Policy, Refund Policy, Damage Claims Policy, Liability Policy, and Privacy Policy.`,
        ],
      },
      {
        heading: "2. Photo & Marketing Consent",
        body: [
          `${company} may take photographs of cleaned areas solely for:`,
        ],
        list: ["Quality control", "Employee training", "Internal documentation"],
      },
      {
        heading: "",
        body: [
          "No personal information or identifiable belongings will be used in advertising without the customer’s separate written permission.",
        ],
      },
      {
        heading: "3. Governing Law",
        body: [
          `${company} provides services throughout ${jurisdictions}.`,
          "This Agreement shall be governed by and interpreted in accordance with the laws of the jurisdiction in which the cleaning services are performed:",
        ],
        list: [
          "Services performed in Virginia shall be governed by the laws of the Commonwealth of Virginia.",
          "Services performed in Maryland shall be governed by the laws of the State of Maryland.",
          "Services performed in the District of Columbia shall be governed by the laws of the District of Columbia.",
        ],
      },
      {
        heading: "",
        body: [
          "Any dispute arising from this Agreement shall be brought in a court of competent jurisdiction located in the jurisdiction where the services were performed, unless otherwise required by applicable law.",
          "The parties agree to first attempt to resolve disputes through good-faith communication before initiating legal action. If any provision of this Agreement is found unenforceable, the remaining provisions shall remain in full force and effect.",
        ],
      },
      {
        heading: "4. Entire Agreement",
        body: [
          `This Agreement constitutes the complete understanding between the Customer and ${company} and supersedes all prior oral or written agreements regarding the services provided.`,
          `No employee or representative may modify this Agreement unless the modification is made in writing and approved by an authorized representative of ${company}.`,
        ],
      },
      {
        heading: "5. Customer Acknowledgment",
        body: [
          "By electronically signing this Agreement, checking the required agreement box, and submitting payment, I acknowledge that:",
        ],
        list: [
          "I have read and understand this Agreement.",
          "I agree to all terms and conditions.",
          `I authorize ${company} to perform the requested services.`,
          "I understand the payment, cancellation, liability, refund, and safety policies.",
          "I understand the Cleaning Scope & Limitations.",
          `I understand that this Agreement is legally binding to the fullest extent permitted by the laws of ${jurisdictions}.`,
        ],
      },
    ],
  },
  "booking-terms": {
    slug: "booking-terms",
    title: "Booking Terms",
    summary: "How bookings are confirmed, scheduled, and accessed.",
    sections: [
      {
        heading: "1. Confirming a Booking",
        body: [
          "A booking is confirmed only after full payment is successfully received. Your appointment is not secured until payment is complete.",
        ],
      },
      {
        heading: "2. Arrival Windows",
        body: [
          "We schedule arrival windows rather than exact times to account for travel and prior appointments. We will make reasonable efforts to keep you informed of our professional’s estimated arrival.",
        ],
      },
      {
        heading: "3. Property Access",
        body: [
          "You are responsible for providing safe, timely access to the property. If our professional cannot access the property at the scheduled time, the appointment may be treated as a late cancellation under our Cancellation Policy.",
        ],
      },
      {
        heading: "4. Accurate Information",
        body: [
          "You agree to provide accurate property details, including size, condition, and any special requirements, so we can deliver an accurate quote and the right service. On-site conditions that differ materially from the information provided may affect pricing or scope.",
        ],
      },
    ],
  },
  scope: {
    slug: "scope",
    title: "Cleaning Scope & Limitations",
    summary: "What our cleaning includes — and the limits of what cleaning can achieve.",
    sections: [
      {
        heading: "1. Service Scope",
        body: [
          "The specific tasks included in your service are described at the time of booking and on the relevant service page. Add-ons and special requests may be available for an additional charge.",
        ],
      },
      {
        heading: "2. Limitations",
        body: [
          "Cleaning has practical limits. Our service is not guaranteed to remove or repair the following pre-existing or permanent conditions:",
        ],
        list: [
          "Permanent stains, discoloration, or fading",
          "Odors absorbed into materials",
          "Mold, mildew, or rust damage",
          "Grout and surface damage or etching",
          "Pre-existing wear, scratches, or damage",
        ],
      },
      {
        heading: "3. Areas We May Not Clean",
        body: [
          "For safety and liability reasons, we may decline to clean certain items or areas, including high or hard-to-reach areas requiring special equipment, biohazards, pest infestations, and items flagged as fragile or high-value.",
        ],
      },
      {
        heading: "4. Health & Safety",
        body: [
          "Our professionals may pause or stop a service if conditions are unsafe. Please disclose any hazards, pets, or special conditions in advance.",
        ],
      },
    ],
  },
  payment: {
    slug: "payment",
    title: "Payment Policy",
    summary: "How payments are handled.",
    sections: [
      {
        heading: "1. Full Payment",
        body: [
          "Full payment is required to confirm and reserve your booking. Your appointment is not secured until payment is complete.",
        ],
      },
      {
        heading: "2. Payment Processing",
        body: [
          "Payments are processed securely through our third-party payment processor. We do not store full card details on our servers.",
        ],
      },
      {
        heading: "3. Pricing Adjustments",
        body: [
          "If on-site conditions differ materially from the information provided at booking, we will discuss any pricing or scope adjustments with you before proceeding.",
        ],
      },
    ],
  },
  cancellation: {
    slug: "cancellation",
    title: "Cancellation Policy",
    summary: "Our policy for rescheduling and cancelling appointments.",
    sections: [
      {
        heading: "1. Rescheduling",
        body: [
          "You may reschedule your appointment up to 48 hours before the scheduled start time at no charge, subject to availability.",
        ],
      },
      {
        heading: "2. Cancellations",
        body: [
          "Cancellations made more than 48 hours in advance are eligible for a full refund. Cancellations within 48 hours may forfeit part or all of the payment to compensate for reserved time.",
        ],
      },
      {
        heading: "3. No-Access & No-Shows",
        body: [
          "If our professional cannot access the property at the scheduled time, the appointment may be treated as a late cancellation and the payment may be retained.",
        ],
      },
      {
        heading: "4. Changes by Perfecto",
        body: [
          `In rare cases ${company} may need to reschedule. If we cannot offer a suitable alternative, your payment will be refunded in full.`,
        ],
      },
    ],
  },
  refund: {
    slug: "refund",
    title: "Refund Policy",
    summary: "When and how refunds are issued.",
    sections: [
      {
        heading: "1. Satisfaction Guarantee",
        body: [
          "If you are not satisfied, contact us within 24 hours and we will re-clean the affected areas at no additional cost.",
        ],
      },
      {
        heading: "2. Deposits",
        body: [
          "Deposits are non-refundable except where required by law.",
        ],
      },
      {
        heading: "3. Non-Refundable Situations",
        body: ["Refunds will not be issued for:"],
        list: [
          "Services completed as contracted",
          "Areas inaccessible during cleaning",
          "Customer dissatisfaction relating to permanent stains, odors, discoloration, mold, rust, or pre-existing conditions",
        ],
      },
      {
        heading: "4. Approved Refunds",
        body: [
          `Any approved refund shall be issued solely at the discretion of ${company} or as otherwise required by applicable law. Approved refunds are typically processed within 5–10 business days, depending on your payment provider.`,
        ],
      },
    ],
  },
  "damage-claims": {
    slug: "damage-claims",
    title: "Damage Claims Policy",
    summary: "How to report and resolve damage claims.",
    sections: [
      {
        heading: "1. Reporting a Claim",
        body: [
          "If you believe damage occurred during a service, you must notify us within 24 hours of service completion with a description and clear photographs of the affected items or areas.",
        ],
      },
      {
        heading: "2. Investigation",
        body: [
          "We will investigate promptly and fairly. Cooperation in providing access, information, and documentation helps us resolve valid claims quickly.",
        ],
      },
      {
        heading: "3. Resolution",
        body: [
          "Valid claims will be resolved through repair, replacement, or compensation at our reasonable discretion, subject to our Liability Policy and the limits described therein.",
        ],
      },
      {
        heading: "4. Exclusions",
        body: [
          "We are not responsible for pre-existing damage, normal wear, or conditions that cannot be remediated through standard cleaning. See our Cleaning Scope & Limitations for details.",
        ],
      },
    ],
  },
  liability: {
    slug: "liability",
    title: "Liability Policy",
    summary: "The scope of our responsibility and insurance coverage.",
    sections: [
      {
        heading: "1. Insurance & Bonding",
        body: [
          `${company} maintains comprehensive bonding and insurance. All cleaning professionals are vetted and trained.`,
        ],
      },
      {
        heading: "2. Damage Claims",
        body: [
          "If you believe damage occurred during a service, notify us within 24 hours with details and photos. See our Damage Claims Policy for the full process.",
        ],
      },
      {
        heading: "3. Valuables & Fragile Items",
        body: [
          "Please secure cash, jewelry, and irreplaceable or high-value items before your appointment, and flag fragile items in your booking notes. We may decline to clean certain delicate items to avoid risk.",
        ],
      },
      {
        heading: "4. Pre-Existing Conditions",
        body: [
          "We are not responsible for pre-existing damage, wear, or stains that cannot be remediated through standard cleaning.",
        ],
      },
      {
        heading: "5. Limitation of Liability",
        body: [
          `To the maximum extent permitted by law, ${company}'s total liability is limited to the amount paid for the service in question, and ${company} is not liable for indirect, incidental, or consequential damages.`,
        ],
      },
    ],
  },
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    summary: `How ${company} collects, uses, and protects your personal information.`,
    sections: [
      {
        heading: "1. Information We Collect",
        body: [
          "We collect information you provide directly — such as your name, phone number, email, property details, and payment information — as well as data generated through your use of the platform.",
        ],
      },
      {
        heading: "2. How We Use Your Information",
        body: [
          "We use your information to verify your identity, process bookings and payments, deliver services, communicate with you, and improve our platform.",
        ],
      },
      {
        heading: "3. Phone Number & Verification",
        body: [
          "Your phone number is your primary account identifier and is verified via a one-time passcode (OTP). Email verification is optional but recommended for account recovery and receipts.",
        ],
      },
      {
        heading: "4. Photos & Documentation",
        body: [
          "Photographs of cleaned areas may be taken for quality control, employee training, and internal documentation. We will not use identifiable belongings or personal information in advertising without your separate written permission. See our Cleaning Service Agreement for details.",
        ],
      },
      {
        heading: "5. Data Sharing",
        body: [
          "We share information only as needed to deliver services (for example, with your assigned cleaning professional) and with trusted processors such as our payment and email providers. We do not sell your personal data.",
        ],
      },
      {
        heading: "6. Data Security & Your Rights",
        body: [
          "We use industry-standard safeguards to protect your data. You may request access to, correction of, or deletion of your personal information by contacting us. Some data may be retained as required by law or for legitimate business purposes.",
        ],
      },
    ],
  },
  terms: {
    slug: "terms",
    title: "Terms & Conditions",
    summary: `These terms govern your use of the ${company} platform and services.`,
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: [
          `By accessing or using the ${company} website, booking a service, or creating an account, you agree to be bound by these Terms & Conditions and the Cleaning Service Agreement. If you do not agree, please do not use our services.`,
        ],
      },
      {
        heading: "2. Services",
        body: [
          `${company} provides residential and commercial cleaning services. Service details, inclusions, and pricing are described at the time of booking and may be confirmed or adjusted after an on-site assessment.`,
        ],
      },
      {
        heading: "3. Bookings & Payment",
        body: [
          "A booking is confirmed only after full payment is successfully received. Your appointment is not secured until payment is complete.",
        ],
      },
      {
        heading: "4. Governing Law",
        body: [
          `These Terms are governed by the laws of the jurisdiction in which the services are performed, within ${jurisdictions}. See our Cleaning Service Agreement for the full governing-law provisions.`,
        ],
      },
      {
        heading: "5. Changes to These Terms",
        body: [
          "We may update these Terms from time to time. Continued use of our services after changes constitutes acceptance of the updated Terms.",
        ],
      },
    ],
  },
};

export const legalSlugs = Object.keys(legalDocuments);
