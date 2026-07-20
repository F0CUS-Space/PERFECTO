import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageHero } from "@/components/shared/page-hero";
import { Section } from "@/components/shared/section";
import { PhoneAuthForm } from "@/features/auth/phone-auth-form";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Perfecto account with your phone number.",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) {
    const fallback = user.role === "ADMIN" ? "/admin" : "/dashboard";
    redirect(safeNextPath(next, fallback));
  }

  return (
    <>
      <PageHero
        title="Welcome back"
        description="Sign in securely with your phone number. No password to remember."
      />
      <Section>
        <Suspense
          fallback={
            <div className="mx-auto h-64 max-w-md animate-pulse rounded-2xl bg-secondary/60" />
          }
        >
          <PhoneAuthForm mode="login" />
        </Suspense>
      </Section>
    </>
  );
}
