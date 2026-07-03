import "server-only";

import type { AdminAuditAction, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  auditEntityHref,
  formatAuditAction,
} from "@/features/admin/audit-log-labels";

export interface LogAdminActionInput {
  actorId: string;
  action: AdminAuditAction;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}

/** Records an admin action. Failures are logged but never block the main operation. */
export async function logAdminAction(input: LogAdminActionInput): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("[audit-log] failed to record action", input.action, error);
  }
}

export function adminDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  phone: string;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.phone;
}

export { auditEntityHref, formatAuditAction };
