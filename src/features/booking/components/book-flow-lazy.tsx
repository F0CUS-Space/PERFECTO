import dynamic from "next/dynamic";

import { BookFlowSkeleton } from "./book-flow-skeleton";

export const BookFlowLazy = dynamic(
  () => import("./book-flow").then((mod) => ({ default: mod.BookFlow })),
  {
    loading: () => <BookFlowSkeleton />,
    ssr: false,
  },
);
