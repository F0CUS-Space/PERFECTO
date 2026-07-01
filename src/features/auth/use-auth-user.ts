"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { AUTH_CHANGED_EVENT } from "@/features/auth/auth-events";
import type { PublicUser } from "@/features/auth/types";

async function fetchAuthUser(): Promise<PublicUser | null> {
  const res = await fetch("/api/auth/me", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user ?? null;
}

export function useAuthUser(initialUser?: PublicUser | null) {
  const pathname = usePathname();
  const [user, setUser] = useState<PublicUser | null | undefined>(
    initialUser !== undefined ? initialUser : undefined,
  );

  const refresh = useCallback(async () => {
    const next = await fetchAuthUser();
    setUser(next);
  }, []);

  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const onAuthChanged = () => void refresh();
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [refresh]);

  return user;
}
