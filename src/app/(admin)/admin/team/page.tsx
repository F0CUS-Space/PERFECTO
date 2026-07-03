import { PaginatedAdminsTable } from "@/features/admin/components/paginated-lists";
import { TeamAccessLookup } from "@/features/admin/components/team-access-lookup";
import { getAdminTeamMembers } from "@/features/admin/queries";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Team — Admin" };

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
          <li>
            Click <strong className="text-brand-navy">Make admin</strong> or{" "}
            <strong className="text-brand-navy">Remove admin access</strong>. They are notified by
            email if an address is on their profile.
          </li>
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
        <div className="mt-4">
          {admins.length === 0 ? (
            <div className="rounded-2xl border border-border px-4 py-8 text-center text-muted-foreground">
              No admins found.
            </div>
          ) : (
            <PaginatedAdminsTable admins={admins} currentAdminId={currentAdmin.id} />
          )}
        </div>
      </section>
    </div>
  );
}
