import { NextResponse } from "next/server";

import { getCustomerPayments } from "@/features/dashboard/queries";
import { getCurrentUser } from "@/server/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payments = await getCustomerPayments(user.id);
  return NextResponse.json({ payments });
}
