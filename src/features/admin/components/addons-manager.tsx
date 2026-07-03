"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LIST_LOAD_MORE, LIST_PAGE_SIZE } from "@/config/list-display";
import { ViewMoreButton, useViewMore } from "@/components/shared/view-more";
import { createAddOn, deleteAddOn, updateAddOn } from "@/features/admin/actions";
import type { AdminAddOnRow } from "@/features/admin/types";
import { formatCurrency } from "@/lib/utils";

function AddOnEditor({ addOn }: { addOn: AdminAddOnRow }) {
  const router = useRouter();
  const [name, setName] = useState(addOn.name);
  const [priceDollars, setPriceDollars] = useState((addOn.price / 100).toFixed(2));
  const [isActive, setIsActive] = useState(addOn.isActive);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateAddOn(addOn.id, {
        name,
        priceDollars: Number(priceDollars),
        isActive,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onDelete = () => {
    const message =
      addOn.serviceCount > 0
        ? `"${addOn.name}" is linked to ${addOn.serviceCount} service(s). It will be deactivated instead of deleted. Continue?`
        : `Delete "${addOn.name}" permanently?`;

    if (!window.confirm(message)) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteAddOn(addOn.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_120px_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor={`addon-name-${addOn.id}`}>Name</Label>
          <Input
            id={`addon-name-${addOn.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`addon-price-${addOn.id}`}>Price (USD)</Label>
          <Input
            id={`addon-price-${addOn.id}`}
            type="number"
            min={0}
            step={0.01}
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Active
        </label>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Used on {addOn.serviceCount} service(s) · currently {formatCurrency(addOn.price)}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onSave} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDelete} disabled={pending}>
          {addOn.serviceCount > 0 ? "Deactivate" : "Delete"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function AddOnsManager({ addOns }: { addOns: AdminAddOnRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [priceDollars, setPriceDollars] = useState("25.00");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createAddOn({
        name,
        priceDollars: Number(priceDollars),
        isActive: true,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setPriceDollars("25.00");
      router.refresh();
    });
  };

  const {
    visibleItems,
    hasMore,
    remaining,
    total,
    visibleCount,
    showMore,
    loadIncrement,
  } = useViewMore(addOns, LIST_PAGE_SIZE.STACK, LIST_LOAD_MORE.STACK);

  return (
    <div className="space-y-8">
      <form onSubmit={onCreate} className="space-y-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5">
        <h2 className="font-semibold text-brand-navy">Add new add-on</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="new-addon-name">Name</Label>
            <Input
              id="new-addon-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Inside Fridge"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-addon-price">Price (USD)</Label>
            <Input
              id="new-addon-price"
              type="number"
              min={0}
              step={0.01}
              required
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      <div className="space-y-4">
        <h2 className="font-semibold text-brand-navy">All add-ons</h2>
        {addOns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No add-ons yet.</p>
        ) : (
          <>
            {visibleItems.map((addOn) => (
              <AddOnEditor key={addOn.id} addOn={addOn} />
            ))}
            <ViewMoreButton
              hasMore={hasMore}
              remaining={remaining}
              total={total}
              visibleCount={visibleCount}
              onShowMore={showMore}
              itemLabel="add-ons"
              loadIncrement={loadIncrement}
            />
          </>
        )}
      </div>
    </div>
  );
}
