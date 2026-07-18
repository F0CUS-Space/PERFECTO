"use client";

import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { QuoteCalculator } from "@/features/quote/quote-calculator";
import type { QuoteCatalogService } from "@/features/quote/queries";
import type { ClaimablePromotion } from "@/features/promotions/queries";
import { useQuoteStore } from "@/features/quote/store";

import { useBookingWizardStore } from "../store";
import { BookFlowSkeleton } from "./book-flow-skeleton";
import { BookingWizard } from "./booking-wizard";

interface BookFlowProps {
  catalog: QuoteCatalogService[];
  claimPromotion?: ClaimablePromotion | null;
}

function BookFlowAuthPrompt() {
  return (
    <Card className="mx-auto max-w-lg shadow-soft">
      <CardHeader className="text-center">
        <CardTitle className="text-brand-navy">Sign in to book</CardTitle>
        <CardDescription>
          Create an account or sign in with your phone number to continue with your booking.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild className="w-full sm:w-auto">
          <Link href="/login?next=/book">
            <LogIn className="h-4 w-4" />
            Sign in
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/register?next=/book">
            <UserPlus className="h-4 w-4" />
            Create account
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function BookFlow({ catalog, claimPromotion }: BookFlowProps) {
  const authUser = useAuthUser();
  const quote = useQuoteStore((s) => s.draft);
  const clearQuote = useQuoteStore((s) => s.clearDraft);
  const resetWizard = useBookingWizardStore((s) => s.resetWizard);

  const startOver = () => {
    clearQuote();
    resetWizard();
  };

  if (authUser === undefined) {
    return <BookFlowSkeleton />;
  }

  if (authUser === null) {
    return <BookFlowAuthPrompt />;
  }

  if (!quote) {
    return <QuoteCalculator catalog={catalog} embedded claimPromotion={claimPromotion} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={startOver}>
          Change service
        </Button>
      </div>
      <BookingWizard />
    </div>
  );
}
