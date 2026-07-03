import { getAdminGalleryItems } from "@/features/gallery/queries";
import { GalleryManager } from "@/features/admin/components/gallery-manager";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Gallery — Admin" };

export default async function AdminGalleryPage() {
  await requireAdmin();
  const items = await getAdminGalleryItems();

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-3xl font-bold text-brand-navy">Gallery</h1>
      <p className="mt-2 text-muted-foreground">
        Manage image cards and before/after pairs on the public gallery page.
      </p>
      <div className="mt-8">
        <GalleryManager items={items} />
      </div>
    </div>
  );
}
