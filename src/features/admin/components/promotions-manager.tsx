"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPromotionDiscountLabel } from "@/features/promotions/services/promotion-discount";
import {
  createPromotion,
  deletePromotion,
  updatePromotion,
} from "@/features/admin/actions";

type ServiceOption = { id: string; name: string };

type PromotionRow = {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number;
  serviceIds: string[];
  serviceNames: string[];
  createdAt: string;
};

type PromotionFormValues = {
  title: string;
  description: string;
  discountType: "FLAT" | "PERCENTAGE";
  flatAmountDollars: string;
  discountPercent: string;
  serviceIds: string[];
};

const selectClass =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm";

function defaultFormValues(promotion?: PromotionRow): PromotionFormValues {
  return {
    title: promotion?.title ?? "",
    description: promotion?.description ?? "",
    discountType: promotion?.discountType ?? "FLAT",
    flatAmountDollars:
      promotion?.discountType === "FLAT" ? String(promotion.discountValue / 100) : "30",
    discountPercent:
      promotion?.discountType === "PERCENTAGE" ? String(promotion.discountValue) : "10",
    serviceIds: promotion?.serviceIds ?? [],
  };
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive
          ? "bg-brand-green/15 text-brand-green"
          : "bg-secondary text-muted-foreground"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function PromotionFormFields({
  values,
  onChange,
  services,
}: {
  values: PromotionFormValues;
  onChange: (next: PromotionFormValues) => void;
  services: ServiceOption[];
}) {
  const toggleService = (serviceId: string) => {
    const next = values.serviceIds.includes(serviceId)
      ? values.serviceIds.filter((id) => id !== serviceId)
      : [...values.serviceIds, serviceId];
    onChange({ ...values, serviceIds: next });
  };

  return (
    <>
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={values.title}
          onChange={(e) => onChange({ ...values, title: e.target.value })}
          placeholder="e.g. Spring cleaning special"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          rows={3}
          value={values.description}
          onChange={(e) => onChange({ ...values, description: e.target.value })}
          placeholder="Describe the offer and any terms…"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Discount type</Label>
          <select
            className={selectClass}
            value={values.discountType}
            onChange={(e) =>
              onChange({
                ...values,
                discountType: e.target.value as "FLAT" | "PERCENTAGE",
              })
            }
          >
            <option value="FLAT">Flat amount ($)</option>
            <option value="PERCENTAGE">Percentage (%)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>
            {values.discountType === "FLAT" ? "Discount amount ($)" : "Discount percent (%)"}
          </Label>
          {values.discountType === "FLAT" ? (
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={values.flatAmountDollars}
              onChange={(e) => onChange({ ...values, flatAmountDollars: e.target.value })}
              required
            />
          ) : (
            <Input
              type="number"
              min={1}
              max={100}
              value={values.discountPercent}
              onChange={(e) => onChange({ ...values, discountPercent: e.target.value })}
              required
            />
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Applies to services</Label>
        <p className="text-xs text-muted-foreground">
          Leave all unchecked to apply the promotion to every service.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((service) => {
            const checked = values.serviceIds.includes(service.id);
            return (
              <label
                key={service.id}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  checked={checked}
                  onChange={() => toggleService(service.id)}
                />
                {service.name}
              </label>
            );
          })}
        </div>
      </div>
    </>
  );
}

function buildPayload(values: PromotionFormValues, isActive: boolean) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    isActive,
    discountType: values.discountType,
    flatAmountDollars:
      values.discountType === "FLAT" ? Number(values.flatAmountDollars) : undefined,
    discountPercent:
      values.discountType === "PERCENTAGE" ? Number(values.discountPercent) : undefined,
    serviceIds: values.serviceIds,
  };
}

export function PromotionsManager({
  promotions,
  services,
}: {
  promotions: PromotionRow[];
  services: ServiceOption[];
}) {
  const router = useRouter();
  const [formValues, setFormValues] = useState<PromotionFormValues>(defaultFormValues());
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<PromotionFormValues>(defaultFormValues());
  const [pending, startTransition] = useTransition();

  const refresh = () => {
    setEditingId(null);
    router.refresh();
  };

  const onCreate = (isActive: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await createPromotion(buildPayload(formValues, isActive));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFormValues(defaultFormValues());
      refresh();
    });
  };

  const onSaveEdit = (promotion: PromotionRow) => {
    setError(null);
    startTransition(async () => {
      const result = await updatePromotion(
        promotion.id,
        buildPayload(editValues, promotion.isActive),
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      refresh();
    });
  };

  const onToggle = (promotion: PromotionRow) => {
    setError(null);
    startTransition(async () => {
      const result = await updatePromotion(promotion.id, {
        title: promotion.title,
        description: promotion.description,
        isActive: !promotion.isActive,
        discountType: promotion.discountType,
        flatAmountDollars:
          promotion.discountType === "FLAT" ? promotion.discountValue / 100 : undefined,
        discountPercent:
          promotion.discountType === "PERCENTAGE" ? promotion.discountValue : undefined,
        serviceIds: promotion.serviceIds,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      refresh();
    });
  };

  const onDelete = (promotion: PromotionRow) => {
    if (
      !window.confirm(
        `Delete "${promotion.title}"? This cannot be undone and removes it from the public promotions page.`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deletePromotion(promotion.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      refresh();
    });
  };

  const canCreate =
    formValues.title.trim() &&
    formValues.description.trim() &&
    (formValues.discountType === "FLAT"
      ? Number(formValues.flatAmountDollars) > 0
      : Number(formValues.discountPercent) >= 1);

  return (
    <div className="space-y-8">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold text-brand-navy">Create promotion</h2>
        <p className="text-sm text-muted-foreground">
          Set a flat or percentage discount. Customers claim offers on the promotions page and the
          discount is applied to their booking total.
        </p>
        <PromotionFormFields values={formValues} onChange={setFormValues} services={services} />
        {error && !editingId && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={pending || !canCreate}
            onClick={() => onCreate(true)}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Publish promotion"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={pending || !canCreate}
            onClick={() => onCreate(false)}
          >
            Save as draft
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-brand-navy">All promotions</h2>
          <p className="text-sm text-muted-foreground">
            {promotions.filter((p) => p.isActive).length} active · {promotions.length} total
          </p>
        </div>
        {promotions.length === 0 ? (
          <p className="rounded-2xl border border-border px-4 py-8 text-center text-muted-foreground">
            No promotions yet. Create one above to get started.
          </p>
        ) : (
          promotions.map((promotion) => (
            <article
              key={promotion.id}
              className="overflow-hidden rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="space-y-2">
                    <p className="break-words font-medium text-brand-navy">{promotion.title}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge isActive={promotion.isActive} />
                      <span className="rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-xs font-medium text-brand-blue">
                        {formatPromotionDiscountLabel(
                          promotion.discountType,
                          promotion.discountValue,
                        )}
                      </span>
                    </div>
                  </div>
                  {editingId !== promotion.id && (
                    <>
                      <p className="mt-2 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                        {promotion.description}
                      </p>
                      <p className="mt-2 break-words text-xs text-muted-foreground">
                        {promotion.serviceNames.length > 0
                          ? `Services: ${promotion.serviceNames.join(", ")}`
                          : "Applies to all services"}
                        {" · "}
                        Created {new Date(promotion.createdAt).toLocaleDateString("en-US")}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                  {editingId !== promotion.id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={pending}
                      onClick={() => {
                        setError(null);
                        setEditingId(promotion.id);
                        setEditValues(defaultFormValues(promotion));
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={promotion.isActive ? "outline" : "default"}
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={pending}
                    onClick={() => onToggle(promotion)}
                  >
                    {promotion.isActive ? "Deactivate" : "Activate & notify"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    className="w-full text-destructive hover:text-destructive sm:w-auto"
                    onClick={() => onDelete(promotion)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>

              {editingId === promotion.id && (
                <div className="mt-4 space-y-4 border-t border-border pt-4">
                  <PromotionFormFields
                    values={editValues}
                    onChange={setEditValues}
                    services={services}
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() => onSaveEdit(promotion)}
                    >
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => {
                        setEditingId(null);
                        setError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
