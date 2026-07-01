import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHero } from "@/components/shared/page-hero";
import { Section } from "@/components/shared/section";
import { formatCurrency } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/db-ready";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Booking Confirmed",
  description: "Your Perfecto booking has been created.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingConfirmationPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/book")}`);
  }

  const { id } = await params;

  if (!isDatabaseConfigured()) {
    notFound();
  }

  const booking = await prisma.booking.findFirst({
    where: { id, userId: user.id },
    include: {
      service: true,
      agreement: true,
      photos: true,
      payments: { where: { type: "DEPOSIT" }, take: 1 },
    },
  });

  if (!booking) {
    notFound();
  }

  const depositPayment = booking.payments[0];

  return (
    <>
      <PageHero
        title="Booking created"
        description="Your appointment is saved. Pay the deposit next to confirm your slot."
      />
      <Section>
        <Card className="mx-auto max-w-2xl border-accent/30">
          <CardHeader>
            <CardTitle>{booking.service.name}</CardTitle>
            <CardDescription>
              Reference {booking.id.slice(0, 8).toUpperCase()} · Status: pending deposit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Date</dt>
                <dd className="font-medium text-brand-navy">
                  {booking.scheduledDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Arrival window</dt>
                <dd className="font-medium text-brand-navy">{booking.arrivalWindow}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Address</dt>
                <dd className="font-medium text-brand-navy">
                  {booking.addressLine}
                  <br />
                  {booking.city}, {booking.postalCode}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total</dt>
                <dd className="font-medium text-brand-navy">
                  {formatCurrency(booking.totalAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Deposit due</dt>
                <dd className="text-lg font-bold tabular-nums text-primary">
                  {formatCurrency(booking.depositAmount)}
                </dd>
              </div>
            </dl>

            {booking.agreement && (
              <p className="rounded-xl bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                Signed by <span className="font-medium text-brand-navy">{booking.agreement.signatureName}</span>{" "}
                on{" "}
                {booking.agreement.signedAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                .
              </p>
            )}

            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-4">
              <p className="font-medium text-brand-navy">Pay deposit — coming in Milestone 5</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Stripe checkout will collect your {formatCurrency(booking.depositAmount)} deposit and
                confirm the booking. Payment status: {depositPayment?.status ?? "PENDING"}.
              </p>
              <Button className="mt-3" disabled>
                Pay deposit (M5)
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>
    </>
  );
}
