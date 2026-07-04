import "server-only";

import type { Role } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

const navy = rgb(0.043, 0.165, 0.29);
const muted = rgb(0.392, 0.455, 0.545);
const line = rgb(0.886, 0.91, 0.941);

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
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const margin = 50;
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const drawText = (
    text: string,
    x: number,
    y: number,
    options?: { font?: typeof regular; size?: number; color?: ReturnType<typeof rgb> },
  ) => {
    page.drawText(text, {
      x,
      y,
      size: options?.size ?? 10,
      font: options?.font ?? regular,
      color: options?.color ?? navy,
    });
  };

  const drawRight = (
    text: string,
    y: number,
    options?: { font?: typeof regular; size?: number; color?: ReturnType<typeof rgb> },
  ) => {
    const font = options?.font ?? regular;
    const size = options?.size ?? 10;
    const textWidth = font.widthOfTextAtSize(text, size);
    drawText(text, width - margin - textWidth, y, { ...options, font, size });
  };

  let y = height - margin;

  drawText("Perfecto Cleaning Services", margin, y, { font: bold, size: 20 });
  drawRight(`Issued ${formatInvoiceDate(invoice.issuedAt)}`, y, { size: 10 });
  y -= 26;
  drawText(`Invoice ${invoice.number}`, margin, y, { size: 11, color: muted });

  y -= 40;
  drawText("Bill to", margin, y, { font: bold });
  y -= 16;
  drawText(invoice.customerName, margin, y);
  y -= 14;
  drawText(invoice.customerPhone, margin, y);
  if (invoice.customerEmail) {
    y -= 14;
    drawText(invoice.customerEmail, margin, y);
  }

  y -= 28;
  drawText("Service address", margin, y, { font: bold });
  y -= 16;
  drawText(invoice.addressLine, margin, y);
  y -= 14;
  drawText(`${invoice.city}, ${invoice.postalCode}`, margin, y);

  y -= 36;
  const colDate = margin + (width - margin * 2) * 0.55;
  const colAmount = width - margin - 80;
  drawText("Description", margin, y, { font: bold });
  drawText("Scheduled", colDate, y, { font: bold });
  drawText("Amount", colAmount, y, { font: bold });

  y -= 18;
  drawText(invoice.serviceName, margin, y);
  drawText(formatScheduledDate(invoice.scheduledDate), colDate, y);
  drawRight(formatCurrency(invoice.amountDue), y);

  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: line,
  });

  const balanceDue = Math.max(invoice.amountDue - invoice.amountPaid, 0);
  const totalsX = width - margin - 220;
  const totalsValue = (label: string, value: string, yPos: number, isBold = false) => {
    const font = isBold ? bold : regular;
    const size = isBold ? 12 : 10;
    drawText(label, totalsX, yPos, { font, size });
    drawRight(value, yPos, { font, size });
  };

  y -= 24;
  totalsValue("Total due", formatCurrency(invoice.amountDue), y);
  y -= 18;
  totalsValue("Paid to date", formatCurrency(invoice.amountPaid), y);
  y -= 20;
  totalsValue("Balance remaining", formatCurrency(balanceDue), y, true);

  y -= 36;
  drawText(
    "Thank you for choosing Perfecto. Balance is due after your service unless already paid in full.",
    margin,
    y,
    { size: 9, color: muted },
  );

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
