import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  RoleBadge,
  TeamMemberRoleActions,
} from "@/features/admin/components/team-member-role-actions";
import { getAdminTeamMembers } from "@/features/admin/queries";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Team — Admin" };

interface PageProps {
  searchParams: Promise<{ q?: string; role?: string }>;
}

function displayName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || "—";
}

export default async function AdminTeamPage({ searchParams }: PageProps) {
  const currentAdmin = await requireAdmin();
  const { q, role: roleParam } = await searchParams;
  const roleFilter =
    roleParam === "ADMIN" || roleParam === "CUSTOMER" ? roleParam : "ALL";

  const members = await getAdminTeamMembers({ q, role: roleFilter });
  const adminCount = members.filter((m) => m.role === "ADMIN").length;

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Team & access</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Admin access is granted to people who already have a Perfecto account. They must
        register and sign in with their phone number first — you are only changing their role
        from customer to admin.
      </p>

      <div className="mt-6 rounded-2xl border border-brand-blue/20 bg-brand-blue/5 p-4 text-sm text-brand-navy">
        <p className="font-medium">How it works</p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-muted-foreground">
          <li>The person registers or signs in on the website (phone OTP).</li>
          <li>They appear in this table as a <strong className="text-brand-navy">Customer</strong>.</li>
          <li>Click <strong className="text-brand-navy">Make admin</strong> to grant admin portal access.</li>
        </ol>
      </div>

      <form className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1 space-y-1">
          <label htmlFor="q" className="text-sm font-medium text-brand-navy">
            Search registered users
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Name, phone, or email…"
            className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="role" className="text-sm font-medium text-brand-navy">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue={roleFilter}
            className="flex h-11 w-full min-w-[160px] rounded-xl border border-input bg-background px-4 text-sm lg:w-auto"
          >
            <option value="ALL">All users</option>
            <option value="ADMIN">Admins only</option>
            <option value="CUSTOMER">Customers only</option>
          </select>
        </div>
        <Button type="submit">Search</Button>
        {(q || roleFilter !== "ALL") && (
          <Button asChild variant="outline">
            <Link href="/admin/team">Clear</Link>
          </Button>
        )}
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        {roleFilter === "ADMIN"
          ? `${adminCount} admin${adminCount === 1 ? "" : "s"}`
          : `${members.length} registered user${members.length === 1 ? "" : "s"} shown`}
      </p>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border bg-secondary/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Joined</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Access</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  {q
                    ? "No registered users match your search."
                    : "No users found. New accounts appear here after someone signs in."}
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-brand-navy">
                    {displayName(member.firstName, member.lastName)}
                    {member.id === currentAdmin.id && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{member.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{member.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <TeamMemberRoleActions
                      userId={member.id}
                      role={member.role}
                      isSelf={member.id === currentAdmin.id}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
