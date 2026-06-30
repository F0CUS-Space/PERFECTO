import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import type { Service } from "@prisma/client";

import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { serviceDetails, defaultServiceDetail } from "@/content/services-detail";

export function ServiceCard({ service }: { service: Service }) {
  const detail = serviceDetails[service.slug] ?? defaultServiceDetail;

  return (
    <Link
      href={`/services/${service.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-soft"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <Image
          src={detail.image}
          alt={service.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className={cn("absolute inset-0 bg-gradient-to-tr mix-blend-multiply opacity-50", detail.accent)} />
        {service.isPopular ? (
          <Badge variant="accent" className="absolute left-4 top-4 bg-card">
            Most Popular
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-semibold text-brand-navy">{service.name}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">
          {service.description}
        </p>
        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            From{" "}
            <span className="text-base font-bold text-brand-navy">
              {formatCurrency(service.basePrice)}
            </span>
          </span>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-brand-navy transition-colors group-hover:bg-brand-blue group-hover:text-white">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
