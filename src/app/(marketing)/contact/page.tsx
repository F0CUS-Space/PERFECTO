import type { Metadata } from "next";
import { Clock, Instagram, Mail, Phone } from "lucide-react";

import { Section } from "@/components/shared/section";
import { PageHero } from "@/components/shared/page-hero";
import { ContactForm } from "@/features/contact/contact-form";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Perfecto Cleaning Services. We're here to help with estimates, bookings, and questions.",
};

interface ContactPageProps {
  searchParams: Promise<{ intent?: string }>;
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const { intent } = await searchParams;
  const isEstimate = intent === "estimate";

  const details = [
    { icon: Phone, label: "Phone", value: siteConfig.contact.phone },
    {
      icon: Mail,
      label: "Email",
      value: siteConfig.contact.email,
      href: `mailto:${siteConfig.contact.email}`,
    },
    {
      icon: Instagram,
      label: "Instagram",
      value: "@perfectocleanings",
      href: siteConfig.social.instagram,
      external: true,
    },
    { icon: Clock, label: "Hours", value: siteConfig.contact.hours },
  ];

  return (
    <>
      <PageHero
        title={isEstimate ? "Request an estimate" : "Let's talk"}
        description={
          isEstimate
            ? "Share a few details about your space. Our team will follow up with a personalized estimate and a secure pay link when you're ready to book."
            : "Questions about a service or booking? Send us a message and our team will respond promptly."
        }
      />

      <Section>
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold text-brand-navy">Get in touch</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Prefer to reach us directly? Here&apos;s how.
            </p>
            <div className="mt-8 space-y-5">
              {details.map(({ icon: Icon, label, value, href, external }) => (
                <div key={label} className="flex items-start gap-4">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-brand-green">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-brand-navy">{label}</p>
                    {href ? (
                      <a
                        href={href}
                        className="text-sm text-muted-foreground transition-colors hover:text-brand-navy"
                        {...(external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">{value}</p>
                    )}
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
