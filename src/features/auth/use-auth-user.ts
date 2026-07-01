"use client";

import { useEffect, useState } from "react";

import type { PublicUser } from "@/features/auth/types";

export function useAuthUser() {
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null));
  }, []);

  return user;
}
