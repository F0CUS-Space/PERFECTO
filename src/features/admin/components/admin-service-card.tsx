import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

import type { AdminServiceRow } from "../types";

export function AdminServiceCard({ service }: { service: AdminServiceRow }) {
  return (
    <Link
      href={`/admin/services/${service.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary/40">
        <Image
          src={service.image}
          alt={service.name}
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized={service.image.startsWith("http")}
        />
        {!service.isActive && (
          <Badge variant="secondary" className="absolute left-3 top-3 bg-card/95">
            Inactive
          </Badge>
        )}
        {service.isPopular && service.isActive && (
          <Badge variant="accent" className="absolute left-3 top-3 bg-card/95">
            Popular
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-brand-navy">{service.name}</h3>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">
          {service.description}
        </p>
      </div>
    </Link>
  );
}
