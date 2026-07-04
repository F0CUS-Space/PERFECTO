"use client";

import { Button } from "@/components/ui/button";
import { QuoteCalculator } from "@/features/quote/quote-calculator";
import type { QuoteCatalogService } from "@/features/quote/queries";
import type { ClaimablePromotion } from "@/features/promotions/queries";
import { useQuoteStore } from "@/features/quote/store";

import { useBookingWizardStore } from "../store";
import { BookingWizard } from "./booking-wizard";

interface BookFlowProps {
  catalog: QuoteCatalogService[];
  claimPromotion?: ClaimablePromotion | null;
}

export function BookFlow({ catalog, claimPromotion }: BookFlowProps) {
  const quote = useQuoteStore((s) => s.draft);
  const clearQuote = useQuoteStore((s) => s.clearDraft);
  const resetWizard = useBookingWizardStore((s) => s.resetWizard);

  const startOver = () => {
    clearQuote();
    resetWizard();
  };

  if (!quote) {
    return <QuoteCalculator catalog={catalog} embedded claimPromotion={claimPromotion} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={startOver}>
          Change service or pricing
        </Button>
      </div>
      <BookingWizard />
    </div>
  );
}
