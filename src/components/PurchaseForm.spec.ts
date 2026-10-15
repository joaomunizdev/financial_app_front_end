import { describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import PurchaseForm from "./PurchaseForm.vue";
import type { Category, CreditCard, Purchase } from "../types/domain";
import type { PurchaseFormValues } from "../schemas/purchaseSchema";

const cards: CreditCard[] = [
  { id: "c1", nickname: "Visa", brand: "Visa", last4: "1234", limitAmount: "1000.00", cardType: "credit", active: true },
  { id: "d1", nickname: "Conta", brand: "Elo", last4: "9999", limitAmount: null, cardType: "debit", active: true },
];
const tenants = [{ id: "t1", name: "Ana" }];
const categories: Category[] = [
  { id: "cat1", name: "Mercado", icon: "mdi-cart-outline", isDefault: true },
];

const purchase: Purchase = {
  id: "p1",
  creditCardId: "c1",
  tenantId: "t1",
  categoryId: "cat1",
  description: "Mercado",
  purchaseDate: "2025-08-01",
  totalAmount: "350.40",
  isInstallment: true,
  installmentsTotal: 6,
  installmentsPaid: 2,
};

function mountForm(modelValue: Purchase | null) {
  return mount(PurchaseForm, {
    props: { modelValue, creditCards: cards, tenants, categories },
    global: { plugins: [createVuetify()] },
  });
}

async function submit(wrapper: ReturnType<typeof mountForm>) {
  await wrapper.find("form").trigger("submit");
  // vee-validate validates asynchronously and Vuetify renders messages on later ticks.
  for (let i = 0; i < 5; i++) {
    await flushPromises();
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe("PurchaseForm", () => {
  it("emits the edited purchase with numeric amount and the original date", async () => {
    const wrapper = mountForm(purchase);
    await submit(wrapper);

    const emitted = wrapper.emitted("submit");
    expect(emitted).toHaveLength(1);
    const values = emitted![0][0] as PurchaseFormValues;
    expect(values).toMatchObject({
      id: "p1",
      creditCardId: "c1",
      tenantId: "t1",
      categoryId: "cat1",
      totalAmount: 350.4,
      purchaseDate: "2025-08-01",
      isInstallment: true,
      installmentsTotal: 6,
      installmentsPaid: 2,
    });
  });

  it("blocks submission and shows required messages for an empty form", async () => {
    const wrapper = mountForm(null);
    await submit(wrapper);

    expect(wrapper.emitted("submit")).toBeUndefined();
    const text = wrapper.text();
    expect(text).toContain("O cartão é obrigatório.");
    expect(text).toContain("O responsável é obrigatório.");
    expect(text).toContain("A descrição é obrigatória.");
  });

  it("hides installments and submits a one-time purchase for a debit card", async () => {
    const wrapper = mountForm({ ...purchase, creditCardId: "d1" });
    expect(wrapper.text()).not.toContain("Parcelada?");
    expect(wrapper.text()).toContain("Cartão de débito");

    await submit(wrapper);
    const values = wrapper.emitted("submit")![0][0] as PurchaseFormValues;
    expect(values).toMatchObject({ creditCardId: "d1", isInstallment: false });
  });

  it("allows a purchase without category", async () => {
    const wrapper = mountForm({ ...purchase, categoryId: null });
    await submit(wrapper);
    const values = wrapper.emitted("submit")![0][0] as PurchaseFormValues;
    expect(values.categoryId).toBeNull();
  });

  it("defaults the date of a new purchase to the local day", () => {
    const wrapper = mountForm(null);
    const input = wrapper.find('input[type="date"]').element as HTMLInputElement;
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    expect(input.value).toBe(expected);
  });
});
