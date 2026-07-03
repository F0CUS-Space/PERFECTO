/**
 * Default visible counts for list UIs — common admin/product patterns:
 * - Tables: 10 rows (Stripe, GitHub default ~10–25; 10 avoids scroll fatigue on laptop)
 * - Card grids: 6 items = 2 rows × 3 columns on desktop
 * - Stacked lists: 8 items ≈ one screen of dense cards
 * - Dashboard previews: 5 items = quick glance without pushing content below fold
 */
export const LIST_PAGE_SIZE = {
  TABLE: 10,
  CARD_GRID: 6,
  STACK: 8,
  PREVIEW: 5,
} as const;

export const LIST_LOAD_MORE = {
  TABLE: 10,
  CARD_GRID: 6,
  STACK: 8,
  PREVIEW: 5,
} as const;
