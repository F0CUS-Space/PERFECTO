import { PromoteAdminForm } from "@/features/admin/components/promote-admin-form";
import { getAdminUsers } from "@/features/admin/queries";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Team — Admin" };

export default async function AdminTeamPage() {
  await requireAdmin();
  const users = await getAdminUsers();
  const admins = users.filter((u) => u.role === "ADMIN");

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Team & admins</h1>
      <p className="mt-2 text-muted-foreground">
        Manage who can access the admin dashboard.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <PromoteAdminForm />

        <div>
          <h2 className="text-lg font-semibold text-brand-navy">Current admins</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="border-b border-border bg-secondary/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Phone</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      No admins found.
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => {
                    const name =
                      [admin.firstName, admin.lastName].filter(Boolean).join(" ") || "—";
                    return (
                      <tr key={admin.id} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3 font-medium text-brand-navy">{name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{admin.phone}</td>
                        <td className="px-4 py-3 text-muted-foreground">{admin.email ?? "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
