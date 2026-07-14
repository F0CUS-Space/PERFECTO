import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/env";
import { runPaymentsMaintenance } from "@/features/payments/services/sweep";
import { getCurrentUser } from "@/server/auth";
import { Role } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authorizes a maintenance trigger. Accepts either:
 *  - a `Bearer <CRON_SECRET>` header (for schedulers / the shell script), or
 *  - an authenticated ADMIN session (so it can be triggered manually).
 */
async function isAuthorized(request: NextRequest): Promise<boolean> {
  const secret = env.CRON_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("authorization");
    if (header && header === `Bearer ${secret}`) return true;
  }

  const user = await getCurrentUser().catch(() => null);
  return user?.role === Role.ADMIN;
}

async function handle(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPaymentsMaintenance();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/payments-sweep] failed", error);
    return NextResponse.json({ error: "Maintenance run failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return handle(request);
}

// Also allow GET so platform cron schedulers that only issue GET requests work.
export async function GET(request: NextRequest) {
  return handle(request);
}
