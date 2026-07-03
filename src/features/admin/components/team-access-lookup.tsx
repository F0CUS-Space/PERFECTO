"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2, Search, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  demoteUserFromAdmin,
  lookupUserForTeamAccess,
  promoteUserToAdminById,
  type TeamMemberLookup,
} from "@/features/admin/actions";
import { RoleBadge } from "@/features/admin/components/team-member-role-actions";
import { cn } from "@/lib/utils";

const MIN_DIGITS = 4;
const DEBOUNCE_MS = 300;

function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function displayName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || "No name on file";
}

type LookupStatus = "idle" | "typing" | "searching" | "found" | "not_found";

export function TeamAccessLookup({ currentAdminId }: { currentAdminId: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<LookupStatus>("idle");
  const [user, setUser] = useState<TeamMemberLookup | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const runLookup = useCallback(async (query: string) => {
    const digits = phoneDigits(query);
    if (digits.length < MIN_DIGITS) {
      setStatus(query.trim() ? "typing" : "idle");
      setUser(null);
      return;
    }

    setStatus("searching");
    setActionError(null);
    setActionSuccess(null);

    const result = await lookupUserForTeamAccess(query);
    if (!result.ok) {
      setStatus("not_found");
      setUser(null);
      setActionError(result.error);
      return;
    }

    if (result.status === "found" && result.user) {
      setUser(result.user);
      setStatus("found");
    } else {
      setUser(null);
      setStatus("not_found");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runLookup(phone);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [phone, runLookup]);

  const onPromote = () => {
    if (!user) return;
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const result = await promoteUserToAdminById(user.id);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setUser({ ...user, role: "ADMIN" });
      setActionSuccess(
        result.emailed
          ? "Admin access granted. They were notified by email."
          : "Admin access granted. No email on their profile — they were not notified.",
      );
      router.refresh();
    });
  };

  const onDemote = () => {
    if (!user) return;
    if (
      !window.confirm(
        "Remove admin access for this user? They will keep their customer account and bookings.",
      )
    ) {
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const result = await demoteUserFromAdmin(user.id);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setUser({ ...user, role: "CUSTOMER" });
      setActionSuccess(
        result.emailed
          ? "Admin access removed. They were notified by email."
          : "Admin access removed. No email on their profile — they were not notified.",
      );
      router.refresh();
    });
  };

  const digits = phoneDigits(phone);
  const isSelf = user?.id === currentAdminId;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="team-phone">Phone number</Label>
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="team-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+10000000001"
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Start typing a registered user&apos;s phone number — their profile appears when there is a match.
        </p>
      </div>

      {status === "typing" && digits.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Keep typing… ({MIN_DIGITS - digits.length} more digit{MIN_DIGITS - digits.length === 1 ? "" : "s"} needed)
        </p>
      )}

      {status === "searching" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Looking up account…
        </div>
      )}

      {status === "not_found" && digits.length >= MIN_DIGITS && (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/20 px-5 py-8 text-center">
          <UserRound className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium text-brand-navy">No account found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The user you&apos;re looking for hasn&apos;t signed up yet. They need to register and sign in
            with their phone number first.
          </p>
        </div>
      )}

      {status === "found" && user && (
        <div className="max-w-lg rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-brand-navy">
                {displayName(user.firstName, user.lastName)}
                {isSelf && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">(you)</span>
                )}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{user.phone}</p>
              <p className="text-sm text-muted-foreground">{user.email ?? "No email on file"}</p>
            </div>
            <RoleBadge role={user.role} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Joined</dt>
              <dd className="font-medium text-brand-navy">
                {new Date(user.createdAt).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Bookings</dt>
              <dd className="font-medium text-brand-navy">{user.bookingCount}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            {user.role === "ADMIN" ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending || isSelf}
                onClick={onDemote}
                title={isSelf ? "You cannot remove your own admin access here." : undefined}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove admin access"}
              </Button>
            ) : (
              <Button type="button" disabled={pending} onClick={onPromote}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Make admin"}
              </Button>
            )}
          </div>

          {!user.email && (
            <p className={cn("mt-3 text-xs text-muted-foreground")}>
              Add an email to their profile so they receive access change notifications.
            </p>
          )}
        </div>
      )}

      {actionSuccess && <p className="text-sm text-brand-green">{actionSuccess}</p>}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}
    </div>
  );
}
