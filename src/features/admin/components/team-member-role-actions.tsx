"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { Role } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { demoteUserFromAdmin, promoteUserToAdminById } from "@/features/admin/actions";
import { cn } from "@/lib/utils";

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
        role === "ADMIN"
          ? "bg-brand-blue/15 text-brand-blue"
          : "bg-secondary text-muted-foreground",
      )}
    >
      {role === "ADMIN" ? "Admin" : "Customer"}
    </span>
  );
}

export function TeamMemberRoleActions({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: Role;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onPromote = () => {
    startTransition(async () => {
      const result = await promoteUserToAdminById(userId);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onDemote = () => {
    if (
      !window.confirm(
        "Remove admin access for this user? They will keep their customer account and bookings.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await demoteUserFromAdmin(userId);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  };

  if (role === "ADMIN") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending || isSelf}
        onClick={onDemote}
        title={isSelf ? "You cannot remove your own admin access here." : undefined}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove admin"}
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onPromote}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Make admin"}
    </Button>
  );
}
