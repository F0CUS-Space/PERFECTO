"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  createBookingOffer,
  searchCustomersForEstimate,
} from "@/features/estimates/actions";
import type {
  EstimateCatalogService,
  EstimateCustomerHit,
} from "@/features/estimates/types";

type LineDraft = {
  key: string;
  addOnId?: string | null;
  name: string;
  priceDollars: string;
  fromCatalog?: boolean;
};

function dollarsToCents(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function displayName(customer: EstimateCustomerHit): string {
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
  return name || customer.phone;
}

export function EstimateCreateForm({ catalog }: { catalog: EstimateCatalogService[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerHits, setCustomerHits] = useState<EstimateCustomerHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [taggedCustomer, setTaggedCustomer] = useState<EstimateCustomerHit | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [serviceId, setServiceId] = useState(catalog[0]?.id ?? "");
  const [servicePriceDollars, setServicePriceDollars] = useState(
    catalog[0] ? (catalog[0].basePrice / 100).toFixed(2) : "0.00",
  );
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [staffNotes, setStaffNotes] = useState("");
  const [messageToCustomer, setMessageToCustomer] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedService = useMemo(
    () => catalog.find((s) => s.id === serviceId) ?? null,
    [catalog, serviceId],
  );

  useEffect(() => {
    if (customerQuery.trim().length < 2) {
      setCustomerHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setSearching(true);
      void searchCustomersForEstimate(customerQuery)
        .then(setCustomerHits)
        .finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [customerQuery]);

  useEffect(() => {
    if (!selectedService) return;
    setServicePriceDollars((selectedService.basePrice / 100).toFixed(2));
    setLines([]);
  }, [selectedService?.id]);

  const totalCents = useMemo(() => {
    const serviceCents = dollarsToCents(servicePriceDollars);
    const linesCents = lines.reduce((sum, line) => sum + dollarsToCents(line.priceDollars), 0);
    return serviceCents + linesCents;
  }, [servicePriceDollars, lines]);

  const selectCustomer = (customer: EstimateCustomerHit) => {
    setTaggedCustomer(customer);
    setCustomerName(displayName(customer));
    setCustomerEmail(customer.email ?? "");
    setCustomerPhone(customer.phone);
    setCustomerQuery("");
    setCustomerHits([]);
  };

  const clearTaggedCustomer = () => {
    setTaggedCustomer(null);
  };

  const toggleCatalogAddOn = (addOn: { id: string; name: string; price: number }) => {
    setLines((prev) => {
      const existing = prev.find((line) => line.addOnId === addOn.id);
      if (existing) {
        return prev.filter((line) => line.key !== existing.key);
      }
      return [
        ...prev,
        {
          key: `addon-${addOn.id}`,
          addOnId: addOn.id,
          name: addOn.name,
          priceDollars: (addOn.price / 100).toFixed(2),
          fromCatalog: true,
        },
      ];
    });
  };

  const addCustomLine = () => {
    setLines((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        name: "",
        priceDollars: "0.00",
        fromCatalog: false,
      },
    ]);
  };

  const updateLine = (key: string, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((line) => line.key !== key));
  };

  const submit = (sendNow: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await createBookingOffer({
        userId: taggedCustomer?.id ?? null,
        customerName,
        customerEmail: customerEmail.trim() || null,
        customerPhone: customerPhone.trim() || null,
        serviceId,
        servicePriceCents: dollarsToCents(servicePriceDollars),
        lines: lines.map((line) => ({
          addOnId: line.addOnId ?? null,
          name: line.name.trim(),
          priceCents: dollarsToCents(line.priceDollars),
        })),
        staffNotes: staffNotes.trim() || null,
        messageToCustomer: messageToCustomer.trim() || null,
        sendNow,
      });

      if (!result.ok) {
        setError(result.error);
        if (result.offerId) {
          router.push(`/admin/estimates/${result.offerId}`);
        }
        return;
      }

      router.push(`/admin/estimates/${result.offerId}`);
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
            <CardDescription>
              Search an existing account or enter contact details manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerSearch">Search customers</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="customerSearch"
                  className="pl-9"
                  placeholder="Name, phone, or email…"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                />
              </div>
              {searching && (
                <p className="text-xs text-muted-foreground">Searching…</p>
              )}
              {customerHits.length > 0 && (
                <ul className="overflow-hidden rounded-xl border border-border">
                  {customerHits.map((hit) => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-secondary/50"
                        onClick={() => selectCustomer(hit)}
                      >
                        <span className="font-medium text-brand-navy">{displayName(hit)}</span>
                        <span className="text-xs text-muted-foreground">
                          {hit.phone}
                          {hit.email ? ` · ${hit.email}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {taggedCustomer && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-brand-blue/20 bg-brand-blue/5 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-brand-navy">
                    Tagged: {displayName(taggedCustomer)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Only this account can complete the pay link.
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={clearTaggedCustomer}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="customerName">Customer name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email (required to send)</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+1…"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service & pricing</CardTitle>
            <CardDescription>
              Set the final estimate yourself — this is not the public calculator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serviceId">Service</Label>
              <select
                id="serviceId"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
              >
                {catalog.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="servicePrice">Service price ($)</Label>
              <Input
                id="servicePrice"
                type="number"
                min="0"
                step="0.01"
                value={servicePriceDollars}
                onChange={(e) => setServicePriceDollars(e.target.value)}
              />
            </div>

            {selectedService && selectedService.addOns.length > 0 && (
              <div className="space-y-2">
                <Label>Catalog add-ons</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedService.addOns.map((addOn) => {
                    const selected = lines.some((line) => line.addOnId === addOn.id);
                    return (
                      <button
                        key={addOn.id}
                        type="button"
                        onClick={() => toggleCatalogAddOn(addOn)}
                        className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                          selected
                            ? "border-brand-blue bg-brand-blue/5"
                            : "border-border hover:bg-secondary/40"
                        }`}
                      >
                        <span className="font-medium text-brand-navy">{addOn.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {formatCurrency(addOn.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCustomLine}>
                  <Plus className="mr-1 h-4 w-4" />
                  Custom line
                </Button>
              </div>
              {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No add-ons or custom lines yet.</p>
              ) : (
                lines.map((line) => (
                  <div key={line.key} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_120px_auto]">
                    <Input
                      value={line.name}
                      onChange={(e) => updateLine(line.key, { name: e.target.value })}
                      placeholder="Line item name"
                      disabled={line.fromCatalog}
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.priceDollars}
                      onChange={(e) => updateLine(line.key, { priceDollars: e.target.value })}
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(line.key)}>
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="messageToCustomer">Message to customer (optional)</Label>
              <Textarea
                id="messageToCustomer"
                value={messageToCustomer}
                onChange={(e) => setMessageToCustomer(e.target.value)}
                placeholder="Shown in the estimate email…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffNotes">Internal staff notes</Label>
              <Textarea
                id="staffNotes"
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                placeholder="Not shared with the customer…"
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="button" disabled={pending || !serviceId} onClick={() => submit(true)}>
            {pending ? "Saving…" : "Save & send"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending || !serviceId}
            onClick={() => submit(false)}
          >
            Save draft
          </Button>
        </div>
      </div>

      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle>Total</CardTitle>
          <CardDescription>Live estimate total</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tabular-nums text-brand-navy">
            {formatCurrency(totalCents)}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex justify-between gap-3">
              <span>{selectedService?.name ?? "Service"}</span>
              <span className="tabular-nums">{formatCurrency(dollarsToCents(servicePriceDollars))}</span>
            </li>
            {lines.map((line) => (
              <li key={line.key} className="flex justify-between gap-3">
                <span>{line.name || "Line item"}</span>
                <span className="tabular-nums">{formatCurrency(dollarsToCents(line.priceDollars))}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
