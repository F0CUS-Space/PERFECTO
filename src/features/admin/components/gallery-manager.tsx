"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LIST_LOAD_MORE, LIST_PAGE_SIZE } from "@/config/list-display";
import { ViewMoreButton, useViewMore } from "@/components/shared/view-more";
import {
  createGalleryItem,
  deleteGalleryItem,
  updateGalleryItem,
} from "@/features/admin/actions";
import type { AdminGalleryItemRow } from "@/features/gallery/queries";

const selectClass =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm";

const CATEGORIES = ["Residential", "Deep Clean", "Office", "Move In/Out"];

async function uploadImage(file: File): Promise<{ key: string; viewUrl: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/uploads/gallery", { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Upload failed.");
  }
  return { key: data.key as string, viewUrl: data.viewUrl as string };
}

function ImagePreview({ src, label }: { src: string | null; label: string }) {
  if (!src) return null;
  return (
    <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-xl border border-border bg-secondary/30">
      <Image src={src} alt={label} fill className="object-cover" sizes="320px" unoptimized />
    </div>
  );
}

function GalleryItemForm({
  item,
  onDone,
}: {
  item?: AdminGalleryItemRow;
  onDone: () => void;
}) {
  const [type, setType] = useState<"CARD" | "BEFORE_AFTER">(item?.type ?? "CARD");
  const [title, setTitle] = useState(item?.title ?? "");
  const [category, setCategory] = useState(item?.category ?? CATEGORIES[0]);
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [beforeUrl, setBeforeUrl] = useState(item?.beforeUrl ?? "");
  const [afterUrl, setAfterUrl] = useState(item?.afterUrl ?? "");
  const [imagePreview, setImagePreview] = useState<string | null>(item?.imageDisplayUrl ?? null);
  const [beforePreview, setBeforePreview] = useState<string | null>(item?.beforeDisplayUrl ?? null);
  const [afterPreview, setAfterPreview] = useState<string | null>(item?.afterDisplayUrl ?? null);
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      for (const url of [imagePreview, beforePreview, afterPreview]) {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      }
    };
  }, [imagePreview, beforePreview, afterPreview]);

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
    const localPreview = URL.createObjectURL(file);
    setUploadingField(field);
    setError(null);
    try {
      const { key, viewUrl } = await uploadImage(file);
      const preview = viewUrl || localPreview;
      if (field === "imageUrl") {
        setImageUrl(key);
        setImagePreview(preview);
      }
      if (field === "beforeUrl") {
        setBeforeUrl(key);
        setBeforePreview(preview);
      }
      if (field === "afterUrl") {
        setAfterUrl(key);
        setAfterPreview(preview);
      }
      if (viewUrl && localPreview.startsWith("blob:")) {
        URL.revokeObjectURL(localPreview);
      }
    } catch (err) {
      if (localPreview.startsWith("blob:")) URL.revokeObjectURL(localPreview);
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingField(null);
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
          <ImagePreview src={imagePreview} label={title || "Gallery image"} />
          <Input type="file" accept="image/*" disabled={uploadingField === "imageUrl"} onChange={(e) => onFile("imageUrl", e.target.files?.[0] ?? null)} />
          {uploadingField === "imageUrl" && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Before image</Label>
            <ImagePreview src={beforePreview} label={`${title} before`} />
            <Input type="file" accept="image/*" disabled={uploadingField === "beforeUrl"} onChange={(e) => onFile("beforeUrl", e.target.files?.[0] ?? null)} />
            {uploadingField === "beforeUrl" && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>After image</Label>
            <ImagePreview src={afterPreview} label={`${title} after`} />
            <Input type="file" accept="image/*" disabled={uploadingField === "afterUrl"} onChange={(e) => onFile("afterUrl", e.target.files?.[0] ?? null)} />
            {uploadingField === "afterUrl" && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
              </p>
            )}
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
      <Button type="submit" disabled={pending || uploadingField !== null}>
        {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : item ? "Save" : "Add to gallery"}
      </Button>
    </form>
  );
}

function GalleryItemThumbnail({ item }: { item: AdminGalleryItemRow }) {
  if (item.type === "CARD" && item.imageDisplayUrl) {
    return (
      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border">
        <Image src={item.imageDisplayUrl} alt={item.title} fill className="object-cover" sizes="96px" unoptimized />
      </div>
    );
  }

  if (item.type === "BEFORE_AFTER") {
    return (
      <div className="flex shrink-0 gap-1">
        {item.beforeDisplayUrl && (
          <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
            <Image src={item.beforeDisplayUrl} alt={`${item.title} before`} fill className="object-cover" sizes="64px" unoptimized />
          </div>
        )}
        {item.afterDisplayUrl && (
          <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
            <Image src={item.afterDisplayUrl} alt={`${item.title} after`} fill className="object-cover" sizes="64px" unoptimized />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 text-xs text-muted-foreground">
      No image
    </div>
  );
}

export function GalleryManager({ items }: { items: AdminGalleryItemRow[] }) {
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
  const {
    visibleItems,
    hasMore,
    remaining,
    total,
    visibleCount,
    showMore,
    loadIncrement,
  } = useViewMore(items, LIST_PAGE_SIZE.STACK, LIST_LOAD_MORE.STACK);

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
        {visibleItems.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
            <div className="flex min-w-0 items-center gap-4">
              <GalleryItemThumbnail item={item} />
              <div>
                <p className="font-medium text-brand-navy">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.type === "CARD" ? "Image card" : "Before & after"} · {item.category}
                  {!item.isActive && " · Inactive"}
                </p>
              </div>
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
      <ViewMoreButton
        hasMore={hasMore}
        remaining={remaining}
        total={total}
        visibleCount={visibleCount}
        onShowMore={showMore}
        itemLabel="items"
        loadIncrement={loadIncrement}
      />
    </div>
  );
}
