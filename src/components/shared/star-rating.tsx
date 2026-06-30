import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function StarRating({ rating = 5, className }: { rating?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i < rating ? "fill-brand-green text-brand-green" : "fill-muted text-muted",
          )}
        />
      ))}
    </div>
  );
}
