"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createService } from "@/features/admin/actions";
import { ServiceImageUpload } from "@/features/admin/components/service-image-upload";
import {
  cleanStringList,
  StringListEditor,
} from "@/features/admin/components/string-list-editor";
import { slugifyServiceName } from "@/features/admin/service-slug";

export function ServiceCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [includes, setIncludes] = useState<string[]>([]);
  const [idealFor, setIdealFor] = useState<string[]>([]);
  const [basePriceDollars, setBasePriceDollars] = useState("120.00");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isPopular, setIsPopular] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === slugifyServiceName(name)) {
      setSlug(slugifyServiceName(value));
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createService({
        name,
        slug: slug || undefined,
        description,
        longDescription: longDescription || undefined,
        includes: cleanStringList(includes),
        idealFor: cleanStringList(idealFor),
        basePriceDollars: Number(basePriceDollars),
        imageUrl: imageUrl || undefined,
        isActive,
        isPopular,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(result.serviceId ? `/admin/services/${result.serviceId}` : "/admin/services");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-border bg-card p-5">
      <div className="space-y-4">
        <h2 className="font-semibold text-brand-navy">Basics</h2>
        <div className="space-y-2">
          <Label htmlFor="new-name">Name</Label>
          <Input id="new-name" required value={name} onChange={(e) => onNameChange(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-slug">URL slug</Label>
          <Input
            id="new-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="offices"
          />
          <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-desc">Short description</Label>
          <Textarea
            id="new-desc"
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Shown on service cards and listings."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-price">Estimate default (USD)</Label>
            <Input
              id="new-price"
              type="number"
              min={0}
              step={0.01}
              required
              value={basePriceDollars}
              onChange={(e) => setBasePriceDollars(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Internal starting amount for staff estimates — not shown as a public price.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <h2 className="font-semibold text-brand-navy">Service page content</h2>
        <p className="text-sm text-muted-foreground">
          This appears on the public service detail page (What&apos;s included, Ideal for, etc.).
        </p>
        <div className="space-y-2">
          <Label htmlFor="new-long-desc">Long description</Label>
          <Textarea
            id="new-long-desc"
            rows={4}
            value={longDescription}
            onChange={(e) => setLongDescription(e.target.value)}
            placeholder="Hero paragraph on the service page."
          />
        </div>
        <StringListEditor
          id="new-includes"
          label="What's included"
          value={includes}
          onChange={setIncludes}
          placeholder="Nightly or weekly cleaning of common areas"
        />
        <StringListEditor
          id="new-ideal-for"
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

      <div className="space-y-3 border-t border-border pt-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Active in booking catalog
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPopular}
            onChange={(e) => setIsPopular(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Mark as popular
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create service"}
      </Button>
    </form>
  );
}
