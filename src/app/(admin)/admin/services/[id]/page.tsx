import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ServiceAddOnsForm } from "@/features/admin/components/service-addons-form";
import { ServiceDeleteButton } from "@/features/admin/components/service-delete-button";
import { ServiceEditForm } from "@/features/admin/components/service-edit-form";
import { getAdminAddOns, getAdminServiceById } from "@/features/admin/queries";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminServiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [service, allAddOns] = await Promise.all([getAdminServiceById(id), getAdminAddOns()]);

  if (!service) {
    notFound();
  }

  return (
    <div className="container py-8 md:py-12">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/services">← Back to services</Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-secondary/30">
            <Image
              src={service.image}
              alt={service.name}
              fill
              className="object-cover"
              sizes="360px"
              priority
              unoptimized={service.image.startsWith("http")}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {service.slug}
            </p>
            <h1 className="text-3xl font-bold text-brand-navy">{service.name}</h1>
            <p className="mt-2 text-muted-foreground">{service.description}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Estimate default:{" "}
              <span className="font-semibold text-brand-navy">
                {formatCurrency(service.basePrice)}
              </span>
            </p>
          </div>

          <ServiceEditForm service={service} />

          <ServiceAddOnsForm
            serviceId={service.id}
            allAddOns={allAddOns}
            linkedAddOnIds={service.linkedAddOnIds}
          />

          <ServiceDeleteButton
            serviceId={service.id}
            serviceName={service.name}
            bookingCount={service.bookingCount}
            isActive={service.isActive}
          />
        </div>
      </div>
    </div>
  );
}
