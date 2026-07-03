/**
 * Default visible counts for list UIs.
 * Kept modest so "View more" appears with typical admin data (dozens, not hundreds of rows).
 */
export const LIST_PAGE_SIZE = {
  /** Admin data tables — 5 rows above the fold, expand by 5 */
  TABLE: 5,
  /** Card grids (3-col) — one row first, then +3 */
  CARD_GRID: 3,
  /** Vertical stacks (gallery, reviews, booking cards) */
  STACK: 5,
  /** Dashboard preview widgets */
  PREVIEW: 3,
} as const;

export const LIST_LOAD_MORE = {
  TABLE: 5,
  CARD_GRID: 3,
  STACK: 5,
  PREVIEW: 3,
} as const;
