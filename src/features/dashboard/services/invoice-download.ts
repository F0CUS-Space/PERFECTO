import "server-only";

import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

type InvoiceData = {
  number: string;
  issuedAt: Date;
  amountDue: number;
  amountPaid: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  serviceName: string;
  scheduledDate: Date;
  addressLine: string;
  city: string;
  postalCode: string;
};

export async function getInvoiceForDownload(bookingId: string, userId: string, role: Role) {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      ...(role === "ADMIN" ? {} : { userId }),
    },
    include: {
      service: true,
      invoice: true,
      user: { select: { firstName: true, lastName: true, phone: true, email: true } },
    },
  });

  if (!booking?.invoice) return null;

  const customerName =
    [booking.user.firstName, booking.user.lastName].filter(Boolean).join(" ") || "Customer";

  return {
    number: booking.invoice.number,
    issuedAt: booking.invoice.issuedAt,
    amountDue: booking.invoice.amountDue,
    amountPaid: booking.invoice.amountPaid,
    customerName,
    customerPhone: booking.user.phone,
    customerEmail: booking.user.email,
    serviceName: booking.service.name,
    scheduledDate: booking.scheduledDate,
    addressLine: booking.addressLine,
    city: booking.city,
    postalCode: booking.postalCode,
  } satisfies InvoiceData;
}

export function renderInvoiceHtml(invoice: InvoiceData): string {
  const balanceDue = Math.max(invoice.amountDue - invoice.amountPaid, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${invoice.number} — Perfecto Cleaning</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #0B2A4A; max-width: 720px; margin: 40px auto; padding: 0 24px; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .muted { color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { text-align: left; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .total { font-weight: 700; font-size: 1.125rem; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Perfecto Cleaning Services</h1>
      <p class="muted">Invoice ${invoice.number}</p>
    </div>
    <div style="text-align:right">
      <p><strong>Issued</strong><br />${invoice.issuedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
    </div>
  </div>

  <p style="margin-top:24px"><strong>Bill to</strong><br />
    ${invoice.customerName}<br />
    ${invoice.customerPhone}${invoice.customerEmail ? `<br />${invoice.customerEmail}` : ""}
  </p>

  <p><strong>Service address</strong><br />
    ${invoice.addressLine}<br />${invoice.city}, ${invoice.postalCode}
  </p>

  <table>
    <thead>
      <tr><th>Description</th><th>Scheduled</th><th style="text-align:right">Amount</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>${invoice.serviceName}</td>
        <td>${invoice.scheduledDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</td>
        <td style="text-align:right">${formatCurrency(invoice.amountDue)}</td>
      </tr>
    </tbody>
  </table>

  <table style="margin-top:16px">
    <tr><td>Total due</td><td style="text-align:right">${formatCurrency(invoice.amountDue)}</td></tr>
    <tr><td>Paid to date</td><td style="text-align:right">${formatCurrency(invoice.amountPaid)}</td></tr>
    <tr class="total"><td>Balance remaining</td><td style="text-align:right">${formatCurrency(balanceDue)}</td></tr>
  </table>

  <p class="muted" style="margin-top:32px;font-size:0.875rem">
    Thank you for choosing Perfecto. Balance is due after your service unless already paid in full.
  </p>
</body>
</html>`;
}
