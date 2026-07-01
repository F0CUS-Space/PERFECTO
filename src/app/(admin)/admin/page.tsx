import { requireAdmin } from "@/server/rbac";

export default async function AdminPage() {
  const user = await requireAdmin();

  return (
    <div className="container py-10 md:py-14">
      <h1 className="text-3xl font-bold text-brand-navy">Admin dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Signed in as {user.firstName ?? "Admin"} ({user.phone}). Full admin tools arrive in
        Milestone 7.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["Bookings", "Customers", "Payments", "Services", "Applications"].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground"
          >
            {item} — M7
          </div>
        ))}
      </div>
    </div>
  );
}
