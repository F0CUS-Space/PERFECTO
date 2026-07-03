"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ReviewStatus } from "@prisma/client";
import { Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LIST_LOAD_MORE, LIST_PAGE_SIZE } from "@/config/list-display";
import { ViewMoreButton, useViewMore } from "@/components/shared/view-more";
import { deleteReview, updateReviewStatus } from "@/features/admin/actions";
import { cn } from "@/lib/utils";

type AdminReview = Awaited<ReturnType<typeof import("@/features/reviews/queries").getAdminReviews>>[number];

export function ReviewsManager({ reviews }: { reviews: AdminReview[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onUpdate = (id: string, status: ReviewStatus, featured: boolean) => {
    startTransition(async () => {
      await updateReviewStatus(id, { status, featured });
      router.refresh();
    });
  };

  const onDelete = (id: string) => {
    if (!window.confirm("Delete this review?")) return;
    startTransition(async () => {
      await deleteReview(id);
      router.refresh();
    });
  };

  const {
    visibleItems,
    hasMore,
    remaining,
    total,
    visibleCount,
    showMore,
    loadIncrement,
  } = useViewMore(reviews, LIST_PAGE_SIZE.STACK, LIST_LOAD_MORE.STACK);

  if (reviews.length === 0) {
    return <p className="text-muted-foreground">No customer reviews yet.</p>;
  }

  return (
    <div className="space-y-4">
      {visibleItems.map((review) => {
        const name = [review.user.firstName, review.user.lastName].filter(Boolean).join(" ").trim() || review.user.phone;
        return (
          <div key={review.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-brand-navy">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {review.booking.service.name} · {review.booking.city} ·{" "}
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-2 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
                      )}
                    />
                  ))}
                </div>
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize">
                {review.status.toLowerCase()}
                {review.featured && " · Featured"}
              </span>
            </div>
            <p className="mt-3 text-sm text-foreground/80">&ldquo;{review.body}&rdquo;</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {review.status !== "APPROVED" && (
                <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onUpdate(review.id, "APPROVED", review.featured)}>
                  Approve
                </Button>
              )}
              {review.status === "APPROVED" && !review.featured && (
                <Button type="button" size="sm" disabled={pending} onClick={() => onUpdate(review.id, "APPROVED", true)}>
                  Feature on testimonials
                </Button>
              )}
              {review.featured && (
                <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onUpdate(review.id, "APPROVED", false)}>
                  Unfeature
                </Button>
              )}
              {review.status !== "REJECTED" && (
                <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => onUpdate(review.id, "REJECTED", false)}>
                  Reject
                </Button>
              )}
              <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => onDelete(review.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
      <ViewMoreButton
        hasMore={hasMore}
        remaining={remaining}
        total={total}
        visibleCount={visibleCount}
        onShowMore={showMore}
        itemLabel="reviews"
        loadIncrement={loadIncrement}
      />
    </div>
  );
}
