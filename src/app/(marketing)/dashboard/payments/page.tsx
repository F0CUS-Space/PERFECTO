import { PaymentsTableClient } from "@/features/dashboard/components/payments-table-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payments",
};

export default function DashboardPaymentsPage() {
  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Payments</h1>
      <p className="mt-2 text-muted-foreground">
        Payments and downloadable invoices for your bookings.
      </p>

      <div className="mt-8">
        <PaymentsTableClient />
      </div>
    </div>
  );
}
