"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { promoteUserToAdmin } from "@/features/admin/actions";

export function PromoteAdminForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await promoteUserToAdmin(phone);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setPhone("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 className="font-semibold text-brand-navy">Add admin</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the phone number of an existing user. They must have registered first.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-phone">Phone (E.164, e.g. +15550100001)</Label>
        <Input
          id="admin-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+15550100001"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Promoting…" : "Make admin"}
      </Button>
      {success && <p className="text-sm text-brand-green">User promoted to admin.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
