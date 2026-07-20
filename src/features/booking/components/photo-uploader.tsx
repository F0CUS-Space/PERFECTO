"use client";

import { useCallback, useEffect, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

import { MAX_PHOTO_BYTES, MAX_PROPERTY_PHOTOS } from "@/config/booking";
import { cn } from "@/lib/utils";

import type { BookingPhotoInput } from "../schema";

interface PhotoUploaderProps {
  photos: BookingPhotoInput[];
  onChange: (photos: BookingPhotoInput[]) => void;
}

export function PhotoUploader({ photos, onChange }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadsEnabled, setUploadsEnabled] = useState<boolean | null>(null);
  const [uploadStatusReason, setUploadStatusReason] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/uploads/status")
      .then((res) => res.json())
      .then((data: { enabled?: boolean; reason?: string }) => {
        setUploadsEnabled(Boolean(data.enabled));
        setUploadStatusReason(data.reason ?? null);
      })
      .catch(() => setUploadsEnabled(false));
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);

      const localPreview = URL.createObjectURL(file);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/uploads/booking-photo", {
          method: "POST",
          body: formData,
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : "Upload failed. Please try again.",
          );
        }

        onChange([
          ...photos,
          {
            s3Key: data.key as string,
            url: data.viewUrl as string,
            previewUrl: localPreview,
          },
        ]);
      } catch (err) {
        URL.revokeObjectURL(localPreview);
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange, photos],
  );

  const onFilesSelected = async (files: FileList | null) => {
    if (!files?.length) return;
    if (photos.length >= MAX_PROPERTY_PHOTOS) {
      setError(`Maximum ${MAX_PROPERTY_PHOTOS} photos`);
      return;
    }

    const file = files[0];
    const allowed = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
    if (!allowed.has(file.type.toLowerCase())) {
      setError("Use a JPEG, PNG, or WebP image");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Each photo must be under 5 MB");
      return;
    }

    await uploadFile(file);
  };

  const removePhoto = (index: number) => {
    const removed = photos[index];
    if (removed.previewUrl) {
      URL.revokeObjectURL(removed.previewUrl);
    }
    onChange(photos.filter((_, i) => i !== index));
  };

  const showUploader = uploadsEnabled === true;
  const checking = uploadsEnabled === null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {photos.map((photo, index) => (
          <div
            key={photo.s3Key}
            className="group relative h-24 w-24 overflow-hidden rounded-xl border border-border bg-secondary/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.previewUrl ?? photo.url}
              alt=""
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removePhoto(index)}
              className="absolute right-1 top-1 rounded-full bg-background/90 p-1 opacity-0 shadow transition-opacity group-hover:opacity-100"
              aria-label="Remove photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {showUploader && photos.length < MAX_PROPERTY_PHOTOS && (
          <label
            className={cn(
              "flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 text-center transition-colors hover:bg-secondary/40",
              uploading && "pointer-events-none opacity-60",
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <ImagePlus className="mb-1 h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">Add photo</span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                void onFilesSelected(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {checking && (
        <p className="text-xs text-muted-foreground">Checking upload availability…</p>
      )}

      {!checking && !showUploader && (
        <p className="text-xs text-muted-foreground">
          {uploadStatusReason ??
            "Photo uploads are not available. Check S3_BUCKET_NAME and AWS credentials on the server."}
        </p>
      )}

      {showUploader && (
        <p className="text-xs text-muted-foreground">
          Optional — up to {MAX_PROPERTY_PHOTOS} photos help our team prepare (5 MB max each).
          Images are optimized on upload for faster loading.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
