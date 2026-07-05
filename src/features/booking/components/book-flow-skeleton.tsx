import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** Shown while the heavy booking wizard chunk loads. */
export function BookFlowSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6" aria-busy="true" aria-label="Loading booking form">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading booking form…
      </div>
      <Card className="shadow-soft">
        <CardHeader>
          <div className="h-6 w-48 animate-pulse rounded-md bg-secondary" />
          <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded-md bg-secondary/80" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-10 animate-pulse rounded-lg bg-secondary" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-10 animate-pulse rounded-lg bg-secondary" />
            <div className="h-10 animate-pulse rounded-lg bg-secondary" />
          </div>
          <div className="h-32 animate-pulse rounded-xl bg-secondary/60" />
          <div className="h-11 animate-pulse rounded-lg bg-secondary" />
        </CardContent>
      </Card>
    </div>
  );
}
