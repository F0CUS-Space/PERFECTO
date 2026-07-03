import "server-only";

import type { Role } from "@prisma/client";
import PDFDocument from "pdfkit";

import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export type InvoiceData = {
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

type BookingWithInvoice = {
  invoice: {
    number: string;
    issuedAt: Date;
    amountDue: number;
    amountPaid: number;
  } | null;
  user: {
    firstName: string | null;
    lastName: string | null;
    phone: string;
    email: string | null;
  };
  service: { name: string };
  scheduledDate: Date;
  addressLine: string;
  city: string;
  postalCode: string;
};

export function buildInvoiceData(booking: BookingWithInvoice): InvoiceData | null {
  if (!booking.invoice) return null;

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
  };
}

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

  if (!booking) return null;
  return buildInvoiceData(booking);
}

function formatInvoiceDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatScheduledDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function renderInvoicePdf(invoice: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const balanceDue = Math.max(invoice.amountDue - invoice.amountPaid, 0);
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const rightX = doc.page.margins.left + pageWidth;
    const navy = "#0B2A4A";
    const muted = "#64748b";

    doc.font("Helvetica-Bold").fontSize(20).fillColor(navy).text("Perfecto Cleaning Services");
    doc.font("Helvetica").fontSize(11).fillColor(muted).text(`Invoice ${invoice.number}`);

    const issuedY = doc.y - doc.currentLineHeight() * 2;
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(navy)
      .text(`Issued ${formatInvoiceDate(invoice.issuedAt)}`, doc.page.margins.left, issuedY, {
        width: pageWidth,
        align: "right",
      });

    doc.moveDown(2);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(navy).text("Bill to");
    doc.font("Helvetica").text(invoice.customerName);
    doc.text(invoice.customerPhone);
    if (invoice.customerEmail) doc.text(invoice.customerEmail);

    doc.moveDown(1.5);
    doc.font("Helvetica-Bold").text("Service address");
    doc.font("Helvetica").text(invoice.addressLine);
    doc.text(`${invoice.city}, ${invoice.postalCode}`);

    doc.moveDown(2);
    const tableTop = doc.y;
    const colDesc = doc.page.margins.left;
    const colDate = colDesc + pageWidth * 0.55;
    const colAmount = rightX - 80;

    doc.font("Helvetica-Bold").fontSize(10).fillColor(navy);
    doc.text("Description", colDesc, tableTop);
    doc.text("Scheduled", colDate, tableTop);
    doc.text("Amount", colAmount, tableTop, { width: 80, align: "right" });

    const rowY = tableTop + 18;
    doc.font("Helvetica").fillColor(navy);
    doc.text(invoice.serviceName, colDesc, rowY, { width: pageWidth * 0.5 });
    doc.text(formatScheduledDate(invoice.scheduledDate), colDate, rowY);
    doc.text(formatCurrency(invoice.amountDue), colAmount, rowY, { width: 80, align: "right" });

    doc
      .strokeColor("#e2e8f0")
      .moveTo(colDesc, rowY + 28)
      .lineTo(rightX, rowY + 28)
      .stroke();

    doc.y = rowY + 44;
    const totalsX = rightX - 220;
    const totalsValX = rightX - 80;

    function totalRow(label: string, value: string, bold = false) {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 12 : 10).fillColor(navy);
      const y = doc.y;
      doc.text(label, totalsX, y);
      doc.text(value, totalsValX, y, { width: 80, align: "right" });
      doc.moveDown(0.6);
    }

    totalRow("Total due", formatCurrency(invoice.amountDue));
    totalRow("Paid to date", formatCurrency(invoice.amountPaid));
    totalRow("Balance remaining", formatCurrency(balanceDue), true);

    doc.moveDown(2);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(muted)
      .text(
        "Thank you for choosing Perfecto. Balance is due after your service unless already paid in full.",
        { width: pageWidth },
      );

    doc.end();
  });
}
