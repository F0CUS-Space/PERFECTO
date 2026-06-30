"use client";

import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface TiltProps {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees. Keep small for a tasteful, premium feel. */
  max?: number;
}

/**
 * Lightweight pointer-driven 3D tilt. Pure transform updates (no re-render),
 * disabled for touch / coarse pointers and respects reduced-motion via CSS.
 */
export function Tilt({ children, className, max = 7 }: TiltProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(
      2,
    )}deg) translateZ(0)`;
  };

  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = "rotateX(0deg) rotateY(0deg)";
  };

  return (
    <div className="perspective">
      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={reset}
        className={cn("transition-transform duration-200 ease-out [transform-style:preserve-3d]", className)}
      >
        {children}
      </div>
    </div>
  );
}
