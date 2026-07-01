import { NextResponse } from "next/server";

import { getCustomerBookings } from "@/features/dashboard/queries";
import { getCurrentUser } from "@/server/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await getCustomerBookings(user.id);
  return NextResponse.json({ bookings });
}
