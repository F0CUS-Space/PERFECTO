"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function useViewMore<T>(items: T[], initialCount: number, step?: number) {
  const increment = step ?? initialCount;
  const [visibleCount, setVisibleCount] = useState(initialCount);

  useEffect(() => {
    setVisibleCount(initialCount);
  }, [items, initialCount]);

  const visibleItems = items.slice(0, visibleCount);
  const remaining = items.length - visibleCount;

  return {
    visibleItems,
    hasMore: remaining > 0,
    remaining,
    total: items.length,
    visibleCount: visibleItems.length,
    showMore: () => setVisibleCount((count) => Math.min(count + increment, items.length)),
    loadIncrement: increment,
  };
}

interface ViewMoreButtonProps {
  hasMore: boolean;
  remaining: number;
  total: number;
  visibleCount: number;
  onShowMore: () => void;
  itemLabel?: string;
  loadIncrement?: number;
  className?: string;
}

export function ViewMoreButton({
  hasMore,
  remaining,
  total,
  visibleCount,
  onShowMore,
  itemLabel = "items",
  loadIncrement,
  className,
}: ViewMoreButtonProps) {
  if (!hasMore) return null;

  const batch = loadIncrement ?? remaining;

  return (
    <div className={cn("flex flex-col items-center gap-1 pt-4", className)}>
      <Button type="button" variant="outline" onClick={onShowMore}>
        View {Math.min(remaining, batch)} more {itemLabel}
        <ChevronDown className="ml-1 h-4 w-4" />
      </Button>
      <p className="text-xs text-muted-foreground">
        Showing {visibleCount} of {total}
      </p>
    </div>
  );
}

interface ViewMoreSectionProps<T> {
  items: T[];
  initialCount: number;
  step?: number;
  itemLabel?: string;
  className?: string;
  footerClassName?: string;
  children: (visibleItems: T[]) => React.ReactNode;
}

export function ViewMoreSection<T>({
  items,
  initialCount,
  step,
  itemLabel = "items",
  className,
  footerClassName,
  children,
}: ViewMoreSectionProps<T>) {
  const { visibleItems, hasMore, remaining, total, visibleCount, showMore, loadIncrement } =
    useViewMore(items, initialCount, step);

  return (
    <div className={className}>
      {children(visibleItems)}
      <ViewMoreButton
        hasMore={hasMore}
        remaining={remaining}
        total={total}
        visibleCount={visibleCount}
        onShowMore={showMore}
        itemLabel={itemLabel}
        loadIncrement={loadIncrement}
        className={footerClassName}
      />
    </div>
  );
}
