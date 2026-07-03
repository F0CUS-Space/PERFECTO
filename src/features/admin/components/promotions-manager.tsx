"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPromotion, updatePromotion } from "@/features/admin/actions";

type PromotionRow = {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: string;
};

export function PromotionsManager({ promotions }: { promotions: PromotionRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createPromotion({ title, description, isActive: true });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setDescription("");
      router.refresh();
    });
  };

  const onToggle = (promotion: PromotionRow) => {
    startTransition(async () => {
      const result = await updatePromotion(promotion.id, {
        title: promotion.title,
        description: promotion.description,
        isActive: !promotion.isActive,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      <form onSubmit={onCreate} className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-brand-navy">Create promotion</h2>
        <p className="text-sm text-muted-foreground">
          Active promotions notify all customers in their notification bell and appear on the public promotions page.
        </p>
        <div className="space-y-2">
          <Label htmlFor="promo-title">Title</Label>
          <Input id="promo-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="promo-desc">Description</Label>
          <Textarea
            id="promo-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Publish promotion"}
        </Button>
      </form>

      <div className="space-y-3">
        <h2 className="font-semibold text-brand-navy">Current promotions</h2>
        {promotions.length === 0 ? (
          <p className="rounded-2xl border border-border px-4 py-8 text-center text-muted-foreground">
            No promotions yet.
          </p>
        ) : (
          promotions.map((promotion) => (
            <article
              key={promotion.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-medium text-brand-navy">{promotion.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{promotion.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Created {new Date(promotion.createdAt).toLocaleDateString("en-US")}
                </p>
              </div>
              <Button
                type="button"
                variant={promotion.isActive ? "outline" : "default"}
                size="sm"
                disabled={pending}
                onClick={() => onToggle(promotion)}
              >
                {promotion.isActive ? "Deactivate" : "Activate & notify"}
              </Button>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
