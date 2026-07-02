import { BrandLogo } from "@/components/shared/brand-logo";
import { cn } from "@/lib/utils";

interface HeroBrandProps {
  className?: string;
}

/** Home hero — wordmark only (transparent PNG). */
export function HeroBrand({ className }: HeroBrandProps) {
  return (
    <div className={cn("max-w-xl", className)}>
      <h1 className="sr-only">PERFECTO — Clean Spaces. Perfect Impression.</h1>
      <BrandLogo hero linked={false} />
    </div>
  );
}
