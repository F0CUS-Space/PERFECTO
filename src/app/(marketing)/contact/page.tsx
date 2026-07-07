import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

import { Section } from "@/components/shared/section";
import { PageHero } from "@/components/shared/page-hero";
import { ContactForm } from "@/features/contact/contact-form";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Perfecto Cleaning Services. We're here to help with quotes, bookings, and questions.",
};

export const revalidate = 3600;

export default function ContactPage() {
  const details = [
    { icon: Phone, label: "Phone", value: siteConfig.contact.phone },
    { icon: Mail, label: "Email", value: siteConfig.contact.email },
    { icon: MapPin, label: "Address", value: siteConfig.contact.address },
    { icon: Clock, label: "Hours", value: siteConfig.contact.hours },
  ];

  return (
    <>
      <PageHero
        title="Let's talk"
        description="Questions about a service or booking? Send us a message and our team will respond promptly."
      />

      <Section>
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold text-brand-navy">Get in touch</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Prefer to reach us directly? Here&apos;s how.
            </p>
            <div className="mt-8 space-y-5">
              {details.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-4">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-brand-green">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-brand-navy">{label}</p>
                    <p className="text-sm text-muted-foreground">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-3">
            <ContactForm />
          </div>
        </div>
      </Section>
    </>
  );
}
