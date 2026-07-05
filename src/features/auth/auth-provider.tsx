"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

type AuthContextValue = {
  user: PublicUser | null | undefined;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: PublicUser | null;
  children: ReactNode;
}) {
  const [user, setUser] = useState<PublicUser | null | undefined>(initialUser);

  const refresh = useCallback(async () => {
    const next = await fetchAuthUser();
    setUser(next);
  }, []);

  useEffect(() => {
    const onAuthChanged = () => void refresh();
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [refresh]);

  const value = useMemo(() => ({ user, refresh }), [user, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Current user from layout-provided context — no refetch on route changes. */
export function useAuthUser(): PublicUser | null | undefined {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthUser must be used within AuthProvider");
  }
  return context.user;
}

/** For routes outside AuthProvider (e.g. admin-only shell). */
export function useAuthUserOptional(): PublicUser | null | undefined {
  return useContext(AuthContext)?.user;
}
