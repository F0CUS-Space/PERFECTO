import type { AdminAuditAction } from "@prisma/client";

export const AUDIT_ACTION_LABELS: Record<AdminAuditAction, string> = {
  BOOKING_STATUS_UPDATE: "Booking status updated",
  SERVICE_CREATE: "Service created",
  SERVICE_UPDATE: "Service updated",
  SERVICE_DELETE: "Service removed",
  SERVICE_ADDONS_UPDATE: "Service add-ons updated",
  ADDON_CREATE: "Add-on created",
  ADDON_UPDATE: "Add-on updated",
  ADDON_DELETE: "Add-on removed",
  APPLICATION_STATUS_UPDATE: "Application status updated",
  JOB_CREATE: "Job posting created",
  JOB_UPDATE: "Job posting updated",
  JOB_DELETE: "Job posting removed",
  USER_PROMOTE_ADMIN: "Admin access granted",
  USER_DEMOTE_ADMIN: "Admin access revoked",
  GALLERY_CREATE: "Gallery item created",
  GALLERY_UPDATE: "Gallery item updated",
  GALLERY_DELETE: "Gallery item deleted",
  REVIEW_UPDATE: "Review updated",
  REVIEW_DELETE: "Review deleted",
  SCHEDULE_BLOCK_CREATE: "Schedule block created",
  SCHEDULE_BLOCK_DELETE: "Schedule block removed",
};

export const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION_LABELS) as AdminAuditAction[];

export function formatAuditAction(action: AdminAuditAction): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function auditEntityHref(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null;

  switch (entityType) {
    case "booking":
      return `/admin/bookings/${entityId}`;
    case "service":
      return `/admin/services/${entityId}`;
    case "addon":
      return "/admin/add-ons";
    case "application":
      return `/admin/applications/${entityId}`;
    case "job":
      return `/admin/jobs/${entityId}`;
    case "user":
      return "/admin/team";
    case "gallery":
      return "/admin/gallery";
    case "review":
      return "/admin/reviews";
    case "schedule_block":
      return "/admin/schedule";
    default:
      return null;
  }
}
