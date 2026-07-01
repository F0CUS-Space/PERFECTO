import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  /** Smaller lockup for footer / compact headers. */
  compact?: boolean;
}

export function BrandLogo({ className, compact }: BrandLogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/brand/perfecto-icon.png"
        alt=""
        width={compact ? 32 : 40}
        height={compact ? 32 : 40}
        className={cn("object-contain", compact ? "h-8 w-8" : "h-10 w-10")}
        aria-hidden
      />
      <Image
        src="/brand/perfecto-wordmark.png"
        alt="Perfecto — Clean Spaces. Perfect Impression."
        width={compact ? 120 : 160}
        height={compact ? 28 : 36}
        className={cn("w-auto object-contain", compact ? "h-7" : "h-9")}
        priority
      />
    </Link>
  );
}
