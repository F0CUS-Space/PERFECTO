"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateService } from "@/features/admin/actions";
import type { AdminServiceDetail, AdminServiceRow } from "@/features/admin/types";
import { formatCurrency } from "@/lib/utils";

export function ServiceEditForm({ service }: { service: AdminServiceRow | AdminServiceDetail }) {
  const router = useRouter();
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description);
  const [basePriceDollars, setBasePriceDollars] = useState((service.basePrice / 100).toFixed(2));
  const [isActive, setIsActive] = useState(service.isActive);
  const [isPopular, setIsPopular] = useState(service.isPopular);
  const [sortOrder, setSortOrder] = useState(String(service.sortOrder));
  const [imageUrl, setImageUrl] = useState(service.imageUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSave = () => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateService(service.id, {
        name,
        description,
        basePriceDollars: Number(basePriceDollars),
        isActive,
        isPopular,
        sortOrder: Number(sortOrder),
        imageUrl: imageUrl || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-brand-navy">{service.slug}</p>
          <p className="text-xs text-muted-foreground">
            Current base: {formatCurrency(service.basePrice)}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Active
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`name-${service.id}`}>Name</Label>
          <Input
            id={`name-${service.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`desc-${service.id}`}>Description</Label>
          <Textarea
            id={`desc-${service.id}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`price-${service.id}`}>Base price (USD)</Label>
          <Input
            id={`price-${service.id}`}
            type="number"
            min={0}
            step={0.01}
            value={basePriceDollars}
            onChange={(e) => setBasePriceDollars(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`sort-${service.id}`}>Sort order</Label>
          <Input
            id={`sort-${service.id}`}
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`image-${service.id}`}>Image URL</Label>
          <Input
            id={`image-${service.id}`}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="/images/service-residential.png"
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to use the default image for this service slug.
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPopular}
          onChange={(e) => setIsPopular(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        Mark as popular
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending ? "Saving…" : "Save service"}
        </Button>
        {success && <p className="text-sm text-brand-green">Saved.</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
