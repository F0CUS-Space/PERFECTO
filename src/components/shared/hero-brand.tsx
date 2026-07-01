import Image from "next/image";

import { cn } from "@/lib/utils";

interface HeroBrandProps {
  className?: string;
}

/** Home hero brand lockup — P icon + PERFECTO h1 + tagline. */
export function HeroBrand({ className }: HeroBrandProps) {
  return (
    <div className={cn("flex items-center gap-3 md:gap-4", className)}>
      <Image
        src="/brand/perfecto-icon.png"
        alt=""
        width={72}
        height={72}
        className="h-14 w-14 shrink-0 object-contain md:h-[4.5rem] md:w-[4.5rem]"
        priority
        aria-hidden
      />
      <div className="min-w-0">
        <h1 className="text-3xl font-bold uppercase tracking-tight text-brand-navy sm:text-4xl md:text-5xl">
          Perfecto
        </h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-navy/85 sm:text-sm">
          Clean Spaces.{" "}
          <span className="text-brand-green">Perfect Impression.</span>
        </p>
      </div>
    </div>
  );
}
