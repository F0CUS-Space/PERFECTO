"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ServiceImageUploadProps {
  imageKey: string;
  previewUrl: string | null;
  onChange: (key: string, previewUrl: string | null) => void;
  label?: string;
}

async function uploadServiceImage(file: File): Promise<{ key: string; viewUrl: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/uploads/service", { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Upload failed.");
  }
  return { key: data.key as string, viewUrl: data.viewUrl as string };
}

export function ServiceImageUpload({
  imageKey,
  previewUrl,
  onChange,
  label = "Service image",
}: ServiceImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onFile = async (file: File | null) => {
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    setUploading(true);
    setError(null);
    try {
      const { key, viewUrl } = await uploadServiceImage(file);
      onChange(key, viewUrl || localPreview);
      if (viewUrl && localPreview.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    } catch (err) {
      if (localPreview.startsWith("blob:")) URL.revokeObjectURL(localPreview);
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const hasImage = Boolean(previewUrl || imageKey);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {previewUrl && (
        <div className="relative aspect-[4/3] w-full max-w-xs overflow-hidden rounded-xl border border-border">
          <Image src={previewUrl} alt="Service preview" fill className="object-cover" sizes="320px" unoptimized />
        </div>
      )}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {hasImage ? "Replace image" : "Choose image"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            void onFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>
      {uploading && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
        </p>
      )}
      {imageKey && !uploading && (
        <p className="text-xs text-muted-foreground">Image saved.</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
