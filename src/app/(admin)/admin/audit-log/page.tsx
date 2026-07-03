import Link from "next/link";
import type { AdminAuditAction } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { PaginatedAuditLogTable } from "@/features/admin/components/paginated-lists";
import { AUDIT_ACTION_LABELS } from "@/features/admin/audit-log-labels";
import { getAdminAuditActors, getAdminAuditLogs } from "@/features/admin/queries";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Audit log — Admin" };

const ACTIONS = Object.keys(AUDIT_ACTION_LABELS) as AdminAuditAction[];

interface PageProps {
  searchParams: Promise<{ action?: string; actor?: string; q?: string }>;
}

export default async function AdminAuditLogPage({ searchParams }: PageProps) {
  await requireAdmin();

  const { action, actor, q } = await searchParams;
  const actionFilter = ACTIONS.includes(action as AdminAuditAction)
    ? (action as AdminAuditAction)
    : undefined;

  const [logs, actors] = await Promise.all([
    getAdminAuditLogs({ action: actionFilter, actorId: actor, q }),
    getAdminAuditActors(),
  ]);

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Audit log</h1>
      <p className="mt-2 text-muted-foreground">
        Track who changed what across bookings, catalog, team access, and content.
      </p>

      <form className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1 space-y-1">
          <label htmlFor="q" className="text-sm font-medium text-brand-navy">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Admin name, phone, summary…"
            className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="action" className="text-sm font-medium text-brand-navy">
            Action
          </label>
          <select
            id="action"
            name="action"
            defaultValue={actionFilter ?? ""}
            className="flex h-11 w-full min-w-[220px] rounded-xl border border-input bg-background px-4 text-sm"
          >
            <option value="">All actions</option>
            {ACTIONS.map((value) => (
              <option key={value} value={value}>
                {AUDIT_ACTION_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="actor" className="text-sm font-medium text-brand-navy">
            Admin
          </label>
          <select
            id="actor"
            name="actor"
            defaultValue={actor ?? ""}
            className="flex h-11 w-full min-w-[180px] rounded-xl border border-input bg-background px-4 text-sm"
          >
            <option value="">All admins</option>
            {actors.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Filter</Button>
        {(q || actionFilter || actor) && (
          <Button asChild variant="outline">
            <Link href="/admin/audit-log">Clear</Link>
          </Button>
        )}
      </form>

      <div className="mt-6">
        {logs.length === 0 ? (
          <div className="rounded-2xl border border-border px-4 py-10 text-center text-muted-foreground">
            No audit entries yet. Actions will appear here as admins make changes.
          </div>
        ) : (
          <PaginatedAuditLogTable logs={logs} />
        )}
      </div>
    </div>
  );
}
