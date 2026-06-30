import type { Testimonial } from "@/content/testimonials";

import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/shared/star-rating";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-4 p-6">
        <StarRating rating={testimonial.rating} />
        <p className="flex-1 text-pretty text-sm leading-relaxed text-foreground/80">
          &ldquo;{testimonial.quote}&rdquo;
        </p>
        <div className="flex items-center gap-3 pt-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-brand-navy">
            {testimonial.name.charAt(0)}
          </span>
          <div>
            <p className="text-sm font-semibold text-brand-navy">{testimonial.name}</p>
            <p className="text-xs text-muted-foreground">{testimonial.location}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
