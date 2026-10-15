import { describe, expect, it } from "vitest";
import { ValidationError } from "yup";
import { purchaseSchema } from "./purchaseSchema";

const valid = {
  creditCardId: "card-1",
  tenantId: "tenant-1",
  description: "Mercado",
  totalAmount: 350.4,
  purchaseDate: "2025-08-01",
  isInstallment: false,
  installmentsTotal: null,
  installmentsPaid: 0,
};

async function errorPaths(values: object) {
  try {
    await purchaseSchema.validate(values, { abortEarly: false });
    return [];
  } catch (e) {
    return (e as ValidationError).inner.map((err) => err.path);
  }
}

describe("purchaseSchema", () => {
  it("requires a card only for card purchases", async () => {
    expect(await errorPaths({ ...valid, creditCardId: "" })).toEqual(["creditCardId"]);
    expect(await errorPaths({ ...valid, paymentMethod: "pix", creditCardId: null })).toEqual([]);
    expect(await errorPaths({ ...valid, paymentMethod: "boleto" })).toEqual(["paymentMethod"]);
  });

  it("accepts a one-time purchase", async () => {
    expect(await errorPaths(valid)).toEqual([]);
  });

  it("keeps purchaseDate as a YYYY-MM-DD string (no timezone cast)", async () => {
    const cast = purchaseSchema.cast(valid);
    expect(cast.purchaseDate).toBe("2025-08-01");
    expect(await errorPaths({ ...valid, purchaseDate: "01/08/2025" })).toEqual([
      "purchaseDate",
    ]);
  });

  it("requires a positive amount", async () => {
    expect(await errorPaths({ ...valid, totalAmount: 0 })).toEqual(["totalAmount"]);
  });

  it("validates installments only when isInstallment is true", async () => {
    const installment = { ...valid, isInstallment: true };
    expect(await errorPaths({ ...installment, installmentsTotal: 1 })).toContain(
      "installmentsTotal"
    );
    expect(
      await errorPaths({ ...installment, installmentsTotal: 3, installmentsPaid: 4 })
    ).toEqual(["installmentsPaid"]);
    expect(
      await errorPaths({ ...installment, installmentsTotal: 3, installmentsPaid: 1 })
    ).toEqual([]);
  });
});
