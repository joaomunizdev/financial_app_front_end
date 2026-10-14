import { describe, expect, it } from "vitest";
import * as yup from "yup";
import { moneyField } from "./money";

async function errorsFor(schema: yup.StringSchema, value: string) {
  try {
    await schema.validate(value, { abortEarly: false });
    return [];
  } catch (e) {
    return (e as yup.ValidationError).errors;
  }
}

describe("moneyField", () => {
  it("accepts masked and plain BRL values", async () => {
    expect(await errorsFor(moneyField(), "R$ 1.234,56")).toEqual([]);
    expect(await errorsFor(moneyField(), "0,00")).toEqual([]);
  });

  it("reports only 'required' for an empty value", async () => {
    expect(await errorsFor(moneyField(), "")).toEqual(["Valor é obrigatório"]);
  });

  it("reports only the format error for invalid text", async () => {
    expect(await errorsFor(moneyField(), "abc")).toEqual([
      "Informe um valor válido em BRL",
    ]);
  });

  it("rejects negatives unless allowed", async () => {
    expect(await errorsFor(moneyField(), "-10,00")).toEqual([
      "O valor não pode ser negativo",
    ]);
    expect(await errorsFor(moneyField({ allowNegative: true }), "-10,00")).toEqual([]);
  });

  it("enforces positive when requested", async () => {
    expect(await errorsFor(moneyField({ positive: true }), "0,00")).toEqual([
      "O valor deve ser maior que zero",
    ]);
  });

  it("rejects values beyond the backend limit", async () => {
    expect(await errorsFor(moneyField(), "99999999999,00")).toEqual([
      "Informe um valor válido em BRL",
    ]);
  });
});
