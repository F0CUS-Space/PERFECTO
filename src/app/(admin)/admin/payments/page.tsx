import { PaginatedPaymentsTable } from "@/features/admin/components/paginated-lists";
import { getAdminPayments } from "@/features/admin/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Payments — Admin" };

export default async function AdminPaymentsPage() {
  const payments = await getAdminPayments();

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Payments</h1>
      <p className="mt-2 text-muted-foreground">All payment activity across bookings.</p>

      <div className="mt-6">
        {payments.length === 0 ? (
          <div className="rounded-2xl border border-border px-4 py-10 text-center text-muted-foreground">
            No payments yet.
          </div>
        ) : (
          <PaginatedPaymentsTable payments={payments} />
        )}
      </div>
    </div>
  );
}
