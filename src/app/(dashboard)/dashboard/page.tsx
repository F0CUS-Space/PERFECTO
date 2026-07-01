import Link from "next/link";
import { AlertTriangle, Calendar, CreditCard, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/rbac";

export default async function DashboardPage() {
  const user = await requireUser();
  const displayName = user.firstName ?? "there";
  const showEmailCaution = user.email && !user.emailVerifiedAt;
  const showAddEmailCaution = !user.email;

  return (
    <div className="container py-10 md:py-14">
      <h1 className="text-3xl font-bold text-brand-navy">Hi, {displayName}</h1>
      <p className="mt-2 text-muted-foreground">Your Perfecto account is ready.</p>

      {showAddEmailCaution ? (
        <div className="mt-6 flex gap-3 rounded-2xl border border-brand-blue/20 bg-brand-blue/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
          <div>
            <p className="font-medium text-brand-navy">Add an email (optional)</p>
            <p className="mt-1 text-muted-foreground">
              Email helps with receipts and account recovery. Your account works fully without it.
            </p>
          </div>
        </div>
      ) : null}

      {showEmailCaution ? (
        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-brand-navy">Verify your email when ready</p>
            <p className="mt-1 text-muted-foreground">
              We sent a verification link to {user.email}. You can still book and manage
              appointments without verifying.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Calendar, title: "Bookings", body: "View upcoming and past cleans — coming in M6." },
          { icon: CreditCard, title: "Payments", body: "Deposits and invoices — coming in M5–M6." },
          { icon: User, title: "Profile", body: "Update your details from account settings soon." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-brand-green">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold text-brand-navy">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/quote">Get a quote</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/book">Book a clean</Link>
        </Button>
      </div>
    </div>
  );
}
