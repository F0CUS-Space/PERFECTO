import { NextResponse } from "next/server";

import {
  getInvoiceForDownload,
  renderInvoiceHtml,
} from "@/features/dashboard/services/invoice-download";
import { getCurrentUser } from "@/server/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Downloadable HTML invoice — ownership-checked by booking id. */
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

  const html = renderInvoiceHtml(invoice);
  const filename = `${invoice.number}.html`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
