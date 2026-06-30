import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

// Placeholder for Milestone 2 (Phone-first Authentication).
export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Perfecto account.",
};

export default function LoginPage() {
  return (
    <ComingSoon
      title="Accounts — coming soon"
      description="Secure phone-first sign in is launching shortly. Soon you'll be able to manage bookings, invoices, and your profile here."
    />
  );
}
