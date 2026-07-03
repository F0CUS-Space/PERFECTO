import { RoleBadge } from "@/features/admin/components/team-member-role-actions";
import { TeamAccessLookup } from "@/features/admin/components/team-access-lookup";
import { getAdminTeamMembers } from "@/features/admin/queries";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Team — Admin" };

function displayName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || "—";
}

export default async function AdminTeamPage() {
  const currentAdmin = await requireAdmin();
  const admins = await getAdminTeamMembers({ role: "ADMIN" });

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Team & access</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Grant or revoke admin access for registered users. They must already have signed up
        with their phone number — you are only changing their role.
      </p>

      <div className="mt-6 rounded-2xl border border-brand-blue/20 bg-brand-blue/5 p-4 text-sm text-brand-navy">
        <p className="font-medium">How it works</p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-muted-foreground">
          <li>The person registers or signs in on the website (phone OTP).</li>
          <li>Type their phone number below — their profile appears when there is a match.</li>
          <li>Click <strong className="text-brand-navy">Make admin</strong> or <strong className="text-brand-navy">Remove admin access</strong>. They are notified by email if an address is on their profile.</li>
        </ol>
      </div>

      <div className="mt-8 max-w-2xl">
        <h2 className="text-lg font-semibold text-brand-navy">Find user</h2>
        <div className="mt-4">
          <TeamAccessLookup currentAdminId={currentAdmin.id} />
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-brand-navy">Current admins</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {admins.length} admin{admins.length === 1 ? "" : "s"} with portal access
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Role</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No admins found.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium text-brand-navy">
                      {displayName(admin.firstName, admin.lastName)}
                      {admin.id === currentAdmin.id && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{admin.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{admin.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={admin.role} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
