import type { InvestmentType, MovementKind } from "../types/domain";

/**
 * Investment types in their fixed order. Each type owns one categorical slot,
 * so a type keeps its color whatever else is in the portfolio (validated
 * palette: dataviz reference slots 1–7, light and dark steps).
 */
export const INVESTMENT_TYPES: {
  value: InvestmentType;
  label: string;
  light: string;
  dark: string;
}[] = [
  { value: "fixed_income", label: "Renda fixa", light: "#2a78d6", dark: "#3987e5" },
  { value: "stocks", label: "Ações", light: "#eb6834", dark: "#d95926" },
  { value: "real_estate_funds", label: "Fundos imobiliários", light: "#1baf7a", dark: "#199e70" },
  { value: "funds", label: "Fundos de investimento", light: "#eda100", dark: "#c98500" },
  { value: "crypto", label: "Criptomoedas", light: "#e87ba4", dark: "#d55181" },
  { value: "pension", label: "Previdência", light: "#008300", dark: "#008300" },
  { value: "other", label: "Outros", light: "#6250d6", dark: "#9085e9" },
];

export function investmentTypeInfo(type: InvestmentType) {
  return INVESTMENT_TYPES.find((t) => t.value === type) ?? INVESTMENT_TYPES[6];
}

export const MOVEMENT_KINDS: { value: MovementKind; label: string; icon: string }[] = [
  { value: "contribution", label: "Aporte", icon: "mdi-arrow-down-bold-circle-outline" },
  { value: "withdrawal", label: "Resgate", icon: "mdi-arrow-up-bold-circle-outline" },
  { value: "balance", label: "Atualizar saldo", icon: "mdi-scale-balance" },
];

export function movementKindLabel(kind: MovementKind): string {
  return kind === "balance" ? "Saldo atualizado" : MOVEMENT_KINDS.find((k) => k.value === kind)!.label;
}
