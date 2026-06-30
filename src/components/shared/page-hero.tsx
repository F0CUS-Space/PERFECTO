import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Animated, blurred brand "orbs" that drift behind hero content to add a soft,
 * premium sense of depth. Pure CSS animation — safe in a server component.
 */
export function HeroBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-brand-mesh",
        className,
      )}
    >
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-blue/25 blur-3xl animate-blob" />
      <div className="absolute -right-20 top-10 h-80 w-80 rounded-full bg-brand-green/25 blur-3xl animate-float-slow" />
      <div className="absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-brand-mint/30 blur-3xl animate-float" />
      <div className="absolute inset-0 bg-dot-grid opacity-60" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}

interface PageHeroProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Optional content placed below the copy (e.g. trust badges). */
  children?: ReactNode;
  /** Optional media rendered to the right on large screens (two-column hero). */
  media?: ReactNode;
  align?: "center" | "left";
  className?: string;
  containerClassName?: string;
}

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  children,
  media,
  align = "center",
  className,
  containerClassName,
}: PageHeroProps) {
  const twoColumn = Boolean(media);

  return (
    <section className={cn("relative overflow-hidden border-b border-border/60", className)}>
      <HeroBackground />
      <div
        className={cn(
          "container",
          twoColumn
            ? "grid items-center gap-12 py-20 md:py-28 lg:grid-cols-2"
            : "py-20 md:py-28",
          !twoColumn && align === "center" && "flex flex-col items-center text-center",
          containerClassName,
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-6",
            !twoColumn && align === "center" && "items-center text-center",
          )}
        >
          {eyebrow ? (
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-blue/20 bg-white/70 px-4 py-1.5 text-xs font-semibold text-brand-blue shadow-card backdrop-blur">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-brand-navy md:text-6xl">
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                "max-w-xl text-pretty text-lg text-muted-foreground",
                !twoColumn && align === "center" && "mx-auto",
              )}
            >
              {description}
            </p>
          ) : null}
          {actions ? <div className="flex flex-col gap-3 sm:flex-row">{actions}</div> : null}
          {children}
        </div>
        {media ? <div className="relative">{media}</div> : null}
      </div>
    </section>
  );
}
