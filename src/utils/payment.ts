import type { PaymentMethod } from "../types/domain";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "card", label: "Cartão", icon: "mdi-credit-card-outline" },
  { value: "pix", label: "Pix", icon: "mdi-bank-transfer" },
  { value: "cash", label: "Dinheiro", icon: "mdi-cash" },
];

export function paymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}
