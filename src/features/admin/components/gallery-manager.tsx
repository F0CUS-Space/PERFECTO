"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { GalleryItem } from "@prisma/client";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createGalleryItem,
  deleteGalleryItem,
  updateGalleryItem,
} from "@/features/admin/actions";

const selectClass =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm";

const CATEGORIES = ["Residential", "Deep Clean", "Office", "Move In/Out"];

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/uploads/gallery", { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Upload failed.");
  }
  return data.key as string;
}

function GalleryItemForm({
  item,
  onDone,
}: {
  item?: GalleryItem;
  onDone: () => void;
}) {
  const [type, setType] = useState<"CARD" | "BEFORE_AFTER">(item?.type ?? "CARD");
  const [title, setTitle] = useState(item?.title ?? "");
  const [category, setCategory] = useState(item?.category ?? CATEGORIES[0]);
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [beforeUrl, setBeforeUrl] = useState(item?.beforeUrl ?? "");
  const [afterUrl, setAfterUrl] = useState(item?.afterUrl ?? "");
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        type,
        title,
        category,
        imageUrl: imageUrl || undefined,
        beforeUrl: beforeUrl || undefined,
        afterUrl: afterUrl || undefined,
        isActive,
        sortOrder: Number(sortOrder),
      };

      const result = item
        ? await updateGalleryItem(item.id, payload)
        : await createGalleryItem(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  };

  const onFile = async (field: "imageUrl" | "beforeUrl" | "afterUrl", file: File | null) => {
    if (!file) return;
    try {
      const key = await uploadImage(file);
      if (field === "imageUrl") setImageUrl(key);
      if (field === "beforeUrl") setBeforeUrl(key);
      if (field === "afterUrl") setAfterUrl(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type</Label>
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={selectClass}>
            <option value="CARD">Image card</option>
            <option value="BEFORE_AFTER">Before & after</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      {type === "CARD" ? (
        <div className="space-y-2">
          <Label>Image</Label>
          <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="S3 key or /images/..." />
          <Input type="file" accept="image/*" onChange={(e) => onFile("imageUrl", e.target.files?.[0] ?? null)} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Before image</Label>
            <Input value={beforeUrl} onChange={(e) => setBeforeUrl(e.target.value)} />
            <Input type="file" accept="image/*" onChange={(e) => onFile("beforeUrl", e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-2">
            <Label>After image</Label>
            <Input value={afterUrl} onChange={(e) => setAfterUrl(e.target.value)} />
            <Input type="file" accept="image/*" onChange={(e) => onFile("afterUrl", e.target.files?.[0] ?? null)} />
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Sort order</Label>
          <Input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-primary" />
          Active on website
        </label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : item ? "Save" : "Add to gallery"}
      </Button>
    </form>
  );
}

export function GalleryManager({ items }: { items: GalleryItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDelete = (id: string) => {
    if (!window.confirm("Remove this gallery item?")) return;
    startTransition(async () => {
      await deleteGalleryItem(id);
      router.refresh();
    });
  };

  const editing = items.find((i) => i.id === editingId);

  return (
    <div className="space-y-8">
      {!showNew && !editing && (
        <Button onClick={() => setShowNew(true)}>Add gallery item</Button>
      )}

      {(showNew || editing) && (
        <GalleryItemForm
          item={editing}
          onDone={() => {
            setShowNew(false);
            setEditingId(null);
            router.refresh();
          }}
        />
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
            <div>
              <p className="font-medium text-brand-navy">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.type === "CARD" ? "Image card" : "Before & after"} · {item.category}
                {!item.isActive && " · Inactive"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setEditingId(item.id); setShowNew(false); }}>
                Edit
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => onDelete(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
