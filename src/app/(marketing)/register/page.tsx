import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageHero } from "@/components/shared/page-hero";
import { Section } from "@/components/shared/section";
import { PhoneAuthForm } from "@/features/auth/phone-auth-form";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your Perfecto account with phone verification — book cleans and manage appointments.",
};

interface RegisterPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) {
    const destination = next ?? (user.role === "ADMIN" ? "/admin" : "/dashboard");
    redirect(destination);
  }

  return (
    <>
      <PageHero
        title="Join Perfecto"
        description="Create your account in minutes. Verify your phone, add optional details, and start booking."
      />
      <Section>
        <Suspense
          fallback={
            <div className="mx-auto h-64 max-w-md animate-pulse rounded-2xl bg-secondary/60" />
          }
        >
          <PhoneAuthForm mode="register" />
        </Suspense>
      </Section>
    </>
  );
}
