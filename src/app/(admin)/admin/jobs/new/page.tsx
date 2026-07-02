import Link from "next/link";

import { Button } from "@/components/ui/button";
import { JobCreateForm } from "@/features/admin/components/job-create-form";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Add job — Admin" };

export default async function AdminJobNewPage() {
  await requireAdmin();

  return (
    <div className="container py-8 md:py-12">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/jobs">← Back to jobs</Link>
      </Button>

      <h1 className="text-3xl font-bold text-brand-navy">Add job posting</h1>
      <p className="mt-2 text-muted-foreground">Create a new role for the careers page.</p>

      <div className="mt-8">
        <JobCreateForm />
      </div>
    </div>
  );
}
