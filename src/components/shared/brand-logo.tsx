import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  /** Smaller lockup for footer / compact headers. */
  compact?: boolean;
  /** Larger lockup for the home hero. */
  hero?: boolean;
  /** Wrap in a home link — off for decorative hero usage. */
  linked?: boolean;
}

const WORDMARK = "/brand/perfecto-wordmark.png";
const ALT = "Perfecto — Clean Spaces. Perfect Impression.";

export function BrandLogo({
  className,
  compact,
  hero,
  linked = true,
}: BrandLogoProps) {
  const image = (
    <Image
      src={WORDMARK}
      alt={ALT}
      width={hero ? 420 : compact ? 140 : 180}
      height={hero ? 90 : compact ? 32 : 40}
      className={cn(
        "w-auto object-contain",
        hero ? "h-12 sm:h-14 md:h-16" : compact ? "h-7" : "h-9",
      )}
      priority={hero || !compact}
    />
  );

  if (!linked) {
    return <div className={className}>{image}</div>;
  }

  return (
    <Link href="/" className={cn("inline-flex items-center", className)}>
      {image}
    </Link>
  );
}
