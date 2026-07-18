"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateService } from "@/features/admin/actions";
import { ServiceImageUpload } from "@/features/admin/components/service-image-upload";
import {
  cleanStringList,
  StringListEditor,
} from "@/features/admin/components/string-list-editor";
import type { AdminServiceDetail, AdminServiceRow } from "@/features/admin/types";
import { formatCurrency } from "@/lib/utils";

export function ServiceEditForm({ service }: { service: AdminServiceRow | AdminServiceDetail }) {
  const router = useRouter();
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description);
  const [longDescription, setLongDescription] = useState(service.longDescription ?? "");
  const [includes, setIncludes] = useState<string[]>(service.includes ?? []);
  const [idealFor, setIdealFor] = useState<string[]>(service.idealFor ?? []);
  const [basePriceDollars, setBasePriceDollars] = useState((service.basePrice / 100).toFixed(2));
  const [isActive, setIsActive] = useState(service.isActive);
  const [isPopular, setIsPopular] = useState(service.isPopular);
  const [sortOrder, setSortOrder] = useState(String(service.sortOrder));
  const [imageUrl, setImageUrl] = useState(service.imageUrl ?? "");
  const [imagePreview, setImagePreview] = useState<string | null>(service.image);
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
        longDescription: longDescription || undefined,
        includes: cleanStringList(includes),
        idealFor: cleanStringList(idealFor),
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
    <div className="space-y-6 rounded-2xl border border-border bg-card p-5">
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
          <Label htmlFor={`desc-${service.id}`}>Short description</Label>
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
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <h3 className="font-semibold text-brand-navy">Service page content</h3>
        <div className="space-y-2">
          <Label htmlFor={`long-${service.id}`}>Long description</Label>
          <Textarea
            id={`long-${service.id}`}
            value={longDescription}
            onChange={(e) => setLongDescription(e.target.value)}
            rows={4}
          />
        </div>
        <StringListEditor
          id={`includes-${service.id}`}
          label="What's included"
          value={includes}
          onChange={setIncludes}
          placeholder="Dusting of all accessible surfaces"
        />
        <StringListEditor
          id={`ideal-${service.id}`}
          label="Ideal for"
          value={idealFor}
          onChange={setIdealFor}
          maxItems={15}
          placeholder="Professional offices"
        />
        <ServiceImageUpload
          imageKey={imageUrl}
          previewUrl={imagePreview}
          onChange={(key, preview) => {
            setImageUrl(key);
            setImagePreview(preview);
          }}
        />
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
