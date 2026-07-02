"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { setServiceAddOns } from "@/features/admin/actions";
import type { AdminAddOnRow } from "@/features/admin/types";
import { formatCurrency } from "@/lib/utils";

export function ServiceAddOnsForm({
  serviceId,
  allAddOns,
  linkedAddOnIds,
}: {
  serviceId: string;
  allAddOns: AdminAddOnRow[];
  linkedAddOnIds: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(linkedAddOnIds);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  };

  const onSave = () => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await setServiceAddOns(serviceId, selected);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 className="font-semibold text-brand-navy">Booking add-ons</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which add-ons customers can select when booking this service.
        </p>
      </div>

      {allAddOns.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No add-ons yet.{" "}
          <a href="/admin/add-ons" className="text-brand-blue hover:underline">
            Create add-ons
          </a>{" "}
          first.
        </p>
      ) : (
        <ul className="space-y-2">
          {allAddOns.map((addOn) => (
            <li key={addOn.id}>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-3">
                <span className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={selected.includes(addOn.id)}
                    onChange={() => toggle(addOn.id)}
                    disabled={!addOn.isActive}
                  />
                  <span className={addOn.isActive ? "text-brand-navy" : "text-muted-foreground"}>
                    {addOn.name}
                    {!addOn.isActive && " (inactive)"}
                  </span>
                </span>
                <span className="text-sm font-medium tabular-nums">
                  +{formatCurrency(addOn.price)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onSave} disabled={pending || allAddOns.length === 0}>
          {pending ? "Saving…" : "Save add-ons"}
        </Button>
        {success && <p className="text-sm text-brand-green">Saved.</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
