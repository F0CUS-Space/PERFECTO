import { ScheduleBlocksManager } from "@/features/admin/components/schedule-blocks-manager";
import { getAdminScheduleBlocks } from "@/features/admin/queries";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Schedule — Admin" };

export default async function AdminSchedulePage() {
  await requireAdmin();
  const blocks = await getAdminScheduleBlocks();

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Schedule & availability</h1>
      <p className="mt-2 text-muted-foreground">
        Block dates or time windows when Perfecto cannot accept new bookings.
      </p>
      <div className="mt-8">
        <ScheduleBlocksManager blocks={blocks} />
      </div>
    </div>
  );
}
