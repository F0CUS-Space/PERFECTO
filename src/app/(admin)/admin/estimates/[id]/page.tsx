import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EstimateDetailActions } from "@/features/estimates/components/estimate-detail-actions";
import { getAdminEstimateById } from "@/features/estimates/queries";
import { formatCurrency, cn } from "@/lib/utils";
import { requireAdmin } from "@/server/rbac";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Estimate ${id.slice(0, 8)} — Admin` };
}

export default async function AdminEstimateDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const estimate = await getAdminEstimateById(id);
  if (!estimate) notFound();

  return (
    <div className="container py-8 md:py-12">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/estimates">← Back to estimates</Link>
      </Button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-navy">{estimate.customerName}</h1>
          <p className="mt-1 text-muted-foreground">
            {estimate.serviceName} · {formatCurrency(estimate.totalAmount)}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium capitalize",
            estimate.status === "SENT" && "bg-brand-blue/10 text-brand-blue",
            estimate.status === "DRAFT" && "bg-secondary text-muted-foreground",
            estimate.status === "CONVERTED" && "bg-accent/15 text-brand-green",
            estimate.status === "CANCELLED" && "bg-destructive/10 text-destructive",
            estimate.status === "EXPIRED" && "bg-amber-100 text-amber-800",
          )}
        >
          {estimate.status.replace(/_/g, " ").toLowerCase()}
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Name:</span> {estimate.customerName}
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span>{" "}
                {estimate.customerEmail ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Phone:</span>{" "}
                {estimate.customerPhone ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Tagged account:</span>{" "}
                {estimate.userId ? (
                  <Link
                    href={`/admin/customers/${estimate.userId}`}
                    className="text-brand-blue hover:underline"
                  >
                    View customer
                  </Link>
                ) : (
                  "None (any signed-in customer can claim)"
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Itemized estimate</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between gap-4 border-b border-border/60 pb-2">
                  <span>{estimate.serviceName}</span>
                  <span className="tabular-nums">
                    {formatCurrency(estimate.breakdown.servicePriceCents)}
                  </span>
                </li>
                {estimate.breakdown.lines.map((line, index) => (
                  <li
                    key={`${line.name}-${index}`}
                    className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0"
                  >
                    <span>{line.name}</span>
                    <span className="tabular-nums">{formatCurrency(line.priceCents)}</span>
                  </li>
                ))}
                <li className="flex justify-between gap-4 pt-2 text-base font-semibold text-brand-navy">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(estimate.totalAmount)}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {(estimate.messageToCustomer || estimate.staffNotes) && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {estimate.messageToCustomer && (
                  <div>
                    <p className="font-medium text-brand-navy">Message to customer</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {estimate.messageToCustomer}
                    </p>
                  </div>
                )}
                {estimate.staffNotes && (
                  <div>
                    <p className="font-medium text-brand-navy">Staff notes</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {estimate.staffNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Send, copy link, or cancel</CardDescription>
            </CardHeader>
            <CardContent>
              <EstimateDetailActions estimate={estimate} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Created by {estimate.createdByName}</p>
              <p>
                Created{" "}
                {new Date(estimate.createdAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              {estimate.sentAt && (
                <p>
                  Sent{" "}
                  {new Date(estimate.sentAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}
              <p>
                Expires{" "}
                {new Date(estimate.expiresAt).toLocaleDateString("en-US", {
                  dateStyle: "medium",
                })}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
