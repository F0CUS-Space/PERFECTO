"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { MoveHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

interface BeforeAfterProps {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  label?: string;
  className?: string;
}

/**
 * Draggable before/after image comparison. Works with mouse, touch, and
 * keyboard (focus the handle and use arrow keys).
 */
export function BeforeAfter({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  label,
  className,
}: BeforeAfterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    updateFromClientX(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border shadow-soft", className)}>
      <div
        ref={containerRef}
        className="group relative aspect-[4/3] w-full select-none"
        onPointerMove={onPointerMove}
      >
        {/* After (base layer) */}
        <Image
          src={afterSrc}
          alt={afterAlt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          unoptimized={afterSrc.startsWith("http")}
        />
        <span className="absolute right-3 top-3 z-10 rounded-full bg-brand-green px-3 py-1 text-xs font-semibold text-white shadow-sm">
          After
        </span>

        {/* Before (clipped overlay via clip-path so the image never squishes) */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        >
          <Image
            src={beforeSrc}
            alt={beforeAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            unoptimized={beforeSrc.startsWith("http")}
          />
          <span className="absolute left-3 top-3 rounded-full bg-brand-navy px-3 py-1 text-xs font-semibold text-white shadow-sm">
            Before
          </span>
        </div>

        {/* Handle */}
        <div className="absolute inset-y-0 z-20 -ml-px w-0.5 bg-white shadow-[0_0_0_1px_rgba(11,42,74,0.15)]" style={{ left: `${pos}%` }}>
          <button
            type="button"
            aria-label="Drag to compare before and after"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 4));
              if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 4));
            }}
            className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-border bg-white text-brand-navy shadow-soft transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
          >
            <MoveHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>
      {label ? (
        <p className="bg-card px-4 py-3 text-sm font-semibold text-brand-navy">{label}</p>
      ) : null}
    </div>
  );
}
