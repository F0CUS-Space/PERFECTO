"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { useState } from "react";

import { getFirebaseAuth } from "@/lib/firebase/client";
import { notifyAuthChanged } from "@/features/auth/auth-events";
import { Button } from "@/components/ui/button";

export function LogoutButton({
  variant = "ghost",
  className,
}: {
  variant?: "ghost" | "outline";
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Logout failed");
      }

      try {
        await signOut(getFirebaseAuth());
      } catch {
        // Session cookie is cleared; Firebase client may not be initialized.
      }

      notifyAuthChanged();
      window.location.assign("/");
    } catch {
      setLoading(false);
      router.refresh();
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={className}
      disabled={loading}
      onClick={handleLogout}
    >
      <LogOut className="h-4 w-4" />
      {loading ? "Signing out…" : "Logout"}
    </Button>
  );
}
