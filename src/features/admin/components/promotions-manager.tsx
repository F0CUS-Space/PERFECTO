"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createPromotion,
  deletePromotion,
  updatePromotion,
} from "@/features/admin/actions";

type PromotionRow = {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: string;
};

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive
          ? "bg-brand-green/15 text-brand-green"
          : "bg-secondary text-muted-foreground"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function PromotionEditForm({
  promotion,
  onDone,
  onError,
}: {
  promotion: PromotionRow;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState(promotion.title);
  const [description, setDescription] = useState(promotion.description);
  const [pending, startTransition] = useTransition();

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updatePromotion(promotion.id, {
        title,
        description,
        isActive: promotion.isActive,
      });
      if (!result.ok) {
        onError(result.error);
        return;
      }
      onDone();
    });
  };

  return (
    <form onSubmit={onSave} className="mt-4 space-y-3 border-t border-border pt-4">
      <div className="space-y-2">
        <Label htmlFor={`edit-title-${promotion.id}`}>Title</Label>
        <Input
          id={`edit-title-${promotion.id}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`edit-desc-${promotion.id}`}>Description</Label>
        <Textarea
          id={`edit-desc-${promotion.id}`}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function PromotionsManager({ promotions }: { promotions: PromotionRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = () => {
    setEditingId(null);
    router.refresh();
  };

  const onCreate = (isActive: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await createPromotion({ title, description, isActive });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setDescription("");
      refresh();
    });
  };

  const onToggle = (promotion: PromotionRow) => {
    setError(null);
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
      refresh();
    });
  };

  const onDelete = (promotion: PromotionRow) => {
    if (
      !window.confirm(
        `Delete "${promotion.title}"? This cannot be undone and removes it from the public promotions page.`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deletePromotion(promotion.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      refresh();
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold text-brand-navy">Create promotion</h2>
        <p className="text-sm text-muted-foreground">
          Published promotions appear on the public promotions page and notify customers in their
          notification bell. Save as draft to prepare an offer before going live.
        </p>
        <div className="space-y-2">
          <Label htmlFor="promo-title">Title</Label>
          <Input
            id="promo-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Spring cleaning special"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="promo-desc">Description</Label>
          <Textarea
            id="promo-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the offer, discount, or terms…"
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending || !title.trim() || !description.trim()}
            onClick={() => onCreate(true)}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Publish promotion"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending || !title.trim() || !description.trim()}
            onClick={() => onCreate(false)}
          >
            Save as draft
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-brand-navy">All promotions</h2>
          <p className="text-sm text-muted-foreground">
            {promotions.filter((p) => p.isActive).length} active · {promotions.length} total
          </p>
        </div>
        {promotions.length === 0 ? (
          <p className="rounded-2xl border border-border px-4 py-8 text-center text-muted-foreground">
            No promotions yet. Create one above to get started.
          </p>
        ) : (
          promotions.map((promotion) => (
            <article
              key={promotion.id}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-brand-navy">{promotion.title}</p>
                    <StatusBadge isActive={promotion.isActive} />
                  </div>
                  {editingId !== promotion.id && (
                    <>
                      <p className="mt-1 text-sm text-muted-foreground">{promotion.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Created {new Date(promotion.createdAt).toLocaleDateString("en-US")}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {editingId !== promotion.id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        setError(null);
                        setEditingId(promotion.id);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={promotion.isActive ? "outline" : "default"}
                    size="sm"
                    disabled={pending}
                    onClick={() => onToggle(promotion)}
                  >
                    {promotion.isActive ? "Deactivate" : "Activate & notify"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(promotion)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>

              {editingId === promotion.id && (
                <PromotionEditForm
                  promotion={promotion}
                  onDone={refresh}
                  onError={setError}
                />
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
