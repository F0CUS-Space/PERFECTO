"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitBookingReview } from "@/features/reviews/actions";
import { cn } from "@/lib/utils";

export function BookingReviewForm({
  bookingId,
  serviceName,
  autoFocus,
}: {
  bookingId: string;
  serviceName: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await submitBookingReview({ bookingId, rating, body });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    router.refresh();
  };

  if (success) {
    return (
      <p className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-brand-navy">
        Thank you for your review! It will appear on our testimonials page once approved.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-secondary/20 p-5 space-y-4">
      <div>
        <p className="font-medium text-brand-navy">Rate your {serviceName} service</p>
        <p className="text-sm text-muted-foreground">Share your experience with Perfecto.</p>
      </div>
      <div className="space-y-2">
        <Label>Rating</Label>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i + 1)}
              className="rounded p-1 hover:bg-secondary"
              aria-label={`${i + 1} stars`}
            >
              <Star
                className={cn(
                  "h-6 w-6",
                  i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`review-${bookingId}`}>Your review</Label>
        <Textarea
          id={`review-${bookingId}`}
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tell us how your clean went…"
          autoFocus={autoFocus}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit review"}
      </Button>
    </form>
  );
}
