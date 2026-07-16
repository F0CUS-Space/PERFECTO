"use client";

import Link from "next/link";

import { LogoutButton } from "@/features/auth/logout-button";
import { useAuthUser } from "@/features/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/shared/notification-bell";

export function AuthNavActions() {
  const user = useAuthUser();

  if (user === undefined) {
    return <div className="hidden h-9 w-24 animate-pulse rounded-lg bg-secondary lg:block" />;
  }

  if (!user) {
    return (
      <div className="hidden items-center gap-2 lg:flex">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Login</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/register">Sign Up</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/contact?intent=estimate">Get estimate</Link>
        </Button>
      </div>
    );
  }

  const dashboardHref = user.role === "ADMIN" ? "/admin" : "/dashboard";

  return (
    <div className="hidden items-center gap-3 lg:flex">
      <NotificationBell firebaseUid={user.firebaseUid} />
      <Button asChild variant="ghost" size="sm">
        <Link href={dashboardHref}>{user.role === "ADMIN" ? "Admin" : "Dashboard"}</Link>
      </Button>
      <LogoutButton />
      <Button asChild size="sm">
        <Link href="/contact?intent=estimate">Get estimate</Link>
      </Button>
    </div>
  );
}
