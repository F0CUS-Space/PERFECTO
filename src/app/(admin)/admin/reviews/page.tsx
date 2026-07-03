import { ReviewsManager } from "@/features/admin/components/reviews-manager";
import { getAdminReviews } from "@/features/reviews/queries";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Reviews — Admin" };

export default async function AdminReviewsPage() {
  await requireAdmin();
  const reviews = await getAdminReviews();

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Customer reviews</h1>
      <p className="mt-2 text-muted-foreground">
        Approve reviews and choose which ones appear on the testimonials page.
      </p>
      <div className="mt-8">
        <ReviewsManager reviews={reviews} />
      </div>
    </div>
  );
}
