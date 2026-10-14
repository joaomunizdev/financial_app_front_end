import * as yup from "yup";
import { useCurrency } from "../composables/useCurrency";

const { toNumberBRL } = useCurrency();

// Backend `IsMoney` accepts up to 10 integer digits.
const MAX_MONEY = 9_999_999_999.99;

type MoneyFieldOptions = {
  requiredMessage?: string;
  allowNegative?: boolean;
  positive?: boolean;
};

/** Yup rule for a BRL text input ("R$ 1.234,56", "1234.56", "-10,00"). */
export function moneyField({
  requiredMessage = "Valor é obrigatório",
  allowNegative = false,
  positive = false,
}: MoneyFieldOptions = {}) {
  return yup
    .string()
    .required(requiredMessage)
    .test("brl-format", "Informe um valor válido em BRL", (value) => {
      if (!value) return true; // reported by required()
      const n = toNumberBRL(value);
      return isFinite(n) && Math.abs(n) <= MAX_MONEY;
    })
    // NaN passes the next two tests so an invalid value reports only the format error.
    .test("brl-sign", "O valor não pode ser negativo", (value) => {
      const n = toNumberBRL(value ?? "");
      return allowNegative || isNaN(n) || n >= 0;
    })
    .test("brl-positive", "O valor deve ser maior que zero", (value) => {
      const n = toNumberBRL(value ?? "");
      return !positive || isNaN(n) || n > 0;
    });
}
