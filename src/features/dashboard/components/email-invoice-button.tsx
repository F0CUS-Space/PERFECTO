"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sendBookingInvoiceEmailAction } from "@/features/notifications/invoice-email-action";

export function EmailInvoiceButton({
  bookingId,
  invoiceNumber,
}: {
  bookingId: string;
  invoiceNumber: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await sendBookingInvoiceEmailAction(bookingId);
            if (result.sent) {
              setMessage("Invoice PDF sent to your email.");
            } else if (result.reason === "no_customer_email") {
              setMessage("Add an email to your profile to receive the invoice.");
            } else {
              setMessage("Could not send the invoice email. Please try again.");
            }
          });
        }}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        Email PDF invoice {invoiceNumber}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
