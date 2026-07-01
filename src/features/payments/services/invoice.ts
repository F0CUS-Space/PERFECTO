import "server-only";

import { prisma } from "@/lib/prisma";

/** Generates a unique invoice number like INV-2026-000042. */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.invoice.count({
      where: { number: { startsWith: prefix } },
    });
    const candidate = `${prefix}${String(count + 1 + attempt).padStart(6, "0")}`;
    const exists = await prisma.invoice.findUnique({ where: { number: candidate } });
    if (!exists) return candidate;
  }

  return `${prefix}${Date.now()}`;
}
