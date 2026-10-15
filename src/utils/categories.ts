import type { Category } from "../types/domain";

export const DEFAULT_CATEGORY_ICON = "mdi-tag-outline";

/** Icons offered when creating a category (Material Design Icons). */
export const CATEGORY_ICONS = [
  "mdi-tag-outline",
  "mdi-silverware-fork-knife",
  "mdi-cart-outline",
  "mdi-coffee-outline",
  "mdi-glass-mug-variant",
  "mdi-sofa-outline",
  "mdi-home-outline",
  "mdi-tools",
  "mdi-file-document-outline",
  "mdi-flash-outline",
  "mdi-car-outline",
  "mdi-gas-station-outline",
  "mdi-bus",
  "mdi-heart-pulse",
  "mdi-pill",
  "mdi-dumbbell",
  "mdi-face-man-shimmer-outline",
  "mdi-tshirt-crew-outline",
  "mdi-laptop",
  "mdi-cellphone",
  "mdi-gamepad-variant-outline",
  "mdi-party-popper",
  "mdi-drama-masks",
  "mdi-music-note-outline",
  "mdi-book-open-variant-outline",
  "mdi-school-outline",
  "mdi-airplane",
  "mdi-gift-outline",
  "mdi-autorenew",
  "mdi-paw",
  "mdi-baby-carriage",
  "mdi-smoking",
  "mdi-cash-multiple",
  "mdi-dots-horizontal-circle-outline",
] as const;

/** Lookup by id; records whose category was deleted resolve to undefined. */
export function categoryMap(categories: Category[]): Map<string, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}
