import Link from "next/link";
import Image from "next/image";

import { siteConfig } from "@/config/site";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "All Services", href: "/services" },
      { label: "Instant Quote", href: "/quote" },
      { label: "Gallery", href: "/gallery" },
      { label: "Promotions", href: "/promotions" },
      { label: "Testimonials", href: "/testimonials" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Cleaning Service Agreement", href: "/legal/agreement" },
      { label: "Booking Terms", href: "/legal/booking-terms" },
      { label: "Cleaning Scope & Limitations", href: "/legal/scope" },
      { label: "Payment Policy", href: "/legal/payment" },
      { label: "Cancellation Policy", href: "/legal/cancellation" },
      { label: "Refund Policy", href: "/legal/refund" },
      { label: "Damage Claims Policy", href: "/legal/damage-claims" },
      { label: "Liability Policy", href: "/legal/liability" },
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/brand/perfecto-logo.png"
                alt="Perfecto Cleaning Services"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
              <span className="text-base font-bold text-brand-navy">Perfecto</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{siteConfig.tagline}</p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-brand-navy">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-brand-navy"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p>{siteConfig.contact.phone}</p>
        </div>
      </div>
    </footer>
  );
}
