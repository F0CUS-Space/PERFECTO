import "server-only";

import type { Prisma } from "@prisma/client";

/**
 * Generates a unique invoice number like INV-2026-000042 using an atomic per-year
 * counter. MUST run inside a transaction so the counter row lock serializes
 * concurrent confirmations and numbers never collide.
 */
export async function generateInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();

  const counter = await tx.invoiceCounter.upsert({
    where: { year },
    create: { year, seq: 1 },
    update: { seq: { increment: 1 } },
  });

  return `INV-${year}-${String(counter.seq).padStart(6, "0")}`;
}
