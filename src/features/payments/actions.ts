"use server";

import { requireUser } from "@/server/rbac";

import { createDepositCheckoutForUser } from "./services/create-deposit-checkout";

export type CreateDepositCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Creates a Stripe Checkout session for the booking payment. */
export async function createDepositCheckout(
  bookingId: string,
): Promise<CreateDepositCheckoutResult> {
  try {
    const user = await requireUser();
    return await createDepositCheckoutForUser(bookingId, user);
  } catch (error) {
    console.error("[createDepositCheckout]", error);
    return { ok: false, error: "Unable to start checkout. Please try again." };
  }
}
