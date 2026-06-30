import Link from "next/link";
import { Hammer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="container flex flex-col items-center py-24 text-center md:py-32">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-brand-green">
        <Hammer className="h-6 w-6" />
      </span>
      <h1 className="mt-6 text-balance text-3xl font-bold tracking-tight text-brand-navy md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-md text-pretty text-muted-foreground">{description}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/services">Explore Services</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/contact">Contact Us</Link>
        </Button>
      </div>
    </div>
  );
}
