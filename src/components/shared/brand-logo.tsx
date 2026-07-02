import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  /** Smaller lockup for footer / compact headers. */
  compact?: boolean;
  /** Larger wordmark-only lockup for the home hero. */
  hero?: boolean;
  /** Wrap in a home link — off for decorative hero usage. */
  linked?: boolean;
}

const ICON = "/brand/perfecto-icon.png";
const WORDMARK = "/brand/perfecto-wordmark.png";
const ALT = "Perfecto — Clean Spaces. Perfect Impression.";

export function BrandLogo({
  className,
  compact,
  hero,
  linked = true,
}: BrandLogoProps) {
  const content = (
    <>
      {!hero && (
        <Image
          src={ICON}
          alt=""
          width={compact ? 32 : 40}
          height={compact ? 32 : 40}
          className={cn("shrink-0 object-contain", compact ? "h-8 w-8" : "h-10 w-10")}
          priority={!compact}
          aria-hidden
        />
      )}
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
    </>
  );

  const wrapperClass = cn(
    "inline-flex items-center",
    !hero && "gap-2.5",
    className,
  );

  if (!linked) {
    return <div className={wrapperClass}>{content}</div>;
  }

  return (
    <Link href="/" className={wrapperClass}>
      {content}
    </Link>
  );
}
