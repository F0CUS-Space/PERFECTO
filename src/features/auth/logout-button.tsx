"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { useState } from "react";

import { getFirebaseAuth } from "@/lib/firebase/client";
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
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      try {
        await signOut(getFirebaseAuth());
      } catch {
        // Session cookie cleared; Firebase client may not be initialized.
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
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
