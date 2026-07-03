import { NextResponse } from "next/server";

import {
  getInvoiceForDownload,
  renderInvoicePdf,
} from "@/features/dashboard/services/invoice-download";
import { getCurrentUser } from "@/server/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Downloadable PDF invoice — ownership-checked by booking id. */
export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: bookingId } = await params;
  const invoice = await getInvoiceForDownload(bookingId, user.id, user.role);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const pdf = await renderInvoicePdf(invoice);
  const filename = `${invoice.number}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
