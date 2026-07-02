"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createService } from "@/features/admin/actions";
import { slugifyServiceName } from "@/features/admin/service-slug";

export function ServiceCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [basePriceDollars, setBasePriceDollars] = useState("120.00");
  const [imageUrl, setImageUrl] = useState("");
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
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4 rounded-2xl border border-border bg-card p-5">
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
          placeholder="residential-cleaning"
        />
        <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-desc">Description</Label>
        <Textarea
          id="new-desc"
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="new-price">Base price (USD)</Label>
          <Input
            id="new-price"
            type="number"
            min={0}
            step={0.01}
            required
            value={basePriceDollars}
            onChange={(e) => setBasePriceDollars(e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="new-image">Image URL (optional)</Label>
          <Input
            id="new-image"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="/images/service-residential.png"
          />
        </div>
      </div>
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create service"}
      </Button>
    </form>
  );
}
