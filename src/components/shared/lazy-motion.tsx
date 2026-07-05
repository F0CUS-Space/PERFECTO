import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

/** Code-split scroll animations — keeps the home page initial JS smaller. */
export const RevealLazy = dynamic(
  () => import("./reveal").then((mod) => ({ default: mod.Reveal })),
  { ssr: true },
);

export type RevealLazyProps = ComponentProps<typeof RevealLazy>;

/** Code-split hero tilt — only the home hero uses this. */
export const TiltLazy = dynamic(
  () => import("./tilt").then((mod) => ({ default: mod.Tilt })),
  { ssr: true },
);

export type TiltLazyProps = ComponentProps<typeof TiltLazy>;
