/** Real card brands accepted by the API (mirror of the backend CARD_BRANDS). */
export const CARD_BRANDS = [
  "Visa",
  "Mastercard",
  "Elo",
  "American Express",
  "Hipercard",
  "Diners Club",
  "Discover",
  "JCB",
  "Cabal",
] as const;

export type CardBrand = (typeof CARD_BRANDS)[number];
