import { NextResponse } from "next/server";
import { z } from "zod";

import { getCustomerPayments } from "@/features/dashboard/queries";
import { getCurrentUser } from "@/server/auth";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
  }

  const { payments, total } = await getCustomerPayments(user.id, parsed.data);
  const offset = parsed.data.offset ?? 0;

  return NextResponse.json({
    payments,
    total,
    hasMore: offset + payments.length < total,
    nextOffset: offset + payments.length,
  });
}
