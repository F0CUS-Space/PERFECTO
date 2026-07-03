"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { markNotificationsRead } from "@/features/notifications/queries";
import { requireUser } from "@/server/rbac";

export async function markNotificationsAsRead(notificationIds?: string[]) {
  const user = await requireUser();
  const parsed = z.array(z.string().min(1)).optional().safeParse(notificationIds);
  if (notificationIds && !parsed.success) {
    return { ok: false as const, error: "Invalid notification ids." };
  }

  await markNotificationsRead(user.id, parsed.data);
  revalidatePath("/api/notifications");
  return { ok: true as const };
}

export async function markAllNotificationsAsRead() {
  const user = await requireUser();
  await markNotificationsRead(user.id);
  revalidatePath("/api/notifications");
  return { ok: true as const };
}
