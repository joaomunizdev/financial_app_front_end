import { describe, expect, it } from "vitest";
import { useCurrency } from "./useCurrency";

const { toNumberBRL, toApiMoney, toDecimalBRL, formatCurrencyOnType, digitsOnly } =
  useCurrency();

// Intl uses a non-breaking space between "R$" and the amount.
const nbsp = (s: string) => s.replace(/ /g, " ");

describe("useCurrency", () => {
  it.each([
    ["R$ 1.234,56", 1234.56],
    ["1.234,56", 1234.56],
    ["1234.56", 1234.56],
    ["1,234.56", 1234.56],
    ["49,90", 49.9],
    ["-10,00", -10],
    ["0.00", 0],
    [12.5, 12.5],
  ])("toNumberBRL(%p) = %p", (input, expected) => {
    expect(toNumberBRL(input)).toBeCloseTo(expected);
  });

  it("returns NaN for empty or invalid input", () => {
    expect(toNumberBRL("")).toBeNaN();
    expect(toNumberBRL("abc")).toBeNaN();
  });

  it.each([
    ["R$ 1.234,56", "1234.56"],
    ["1.234,56", "1234.56"],
    ["49,9", "49.90"],
    ["-80,00", "-80.00"],
    [10, "10.00"],
    ["", "0.00"],
  ])("toApiMoney(%p) = %p (backend IsMoney format)", (input, expected) => {
    expect(toApiMoney(input)).toBe(expected);
  });

  it("toDecimalBRL formats an editable pt-BR decimal", () => {
    expect(toDecimalBRL("1234.5")).toBe("1.234,50");
    expect(toDecimalBRL("-10.00")).toBe("-10,00");
  });

  it("formatCurrencyOnType treats typed digits as cents", () => {
    expect(nbsp(formatCurrencyOnType("12345"))).toBe("R$ 123,45");
    expect(nbsp(formatCurrencyOnType(""))).toBe("R$ 0,00");
  });

  it("digitsOnly strips non-digits and truncates", () => {
    expect(digitsOnly("12a3-45", 4)).toBe("1234");
  });
});
