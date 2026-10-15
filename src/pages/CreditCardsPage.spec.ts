import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createVuetify } from "vuetify";
import CreditCardsPage from "./CreditCardsPage.vue";
import { useConfirmStore } from "../stores/confirm";

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("../plugins/http", () => ({ default: http }));

const card = {
  id: "c1",
  nickname: "Principal",
  brand: "Visa",
  last4: "1234",
  limitAmount: "5000.00",
  cardType: "credit" as const,
  active: true,
};

type PageVm = {
  remove: (c: typeof card) => Promise<void>;
  openNew: () => void;
  edit: (c: typeof card) => void;
  save: () => Promise<void>;
  form: {
    nickname: string;
    brand: string;
    last4: string;
    limitAmount: string;
    cardType: "credit" | "debit";
  };
};

async function mountPage() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(CreditCardsPage, {
    global: { plugins: [pinia, createVuetify()] },
  });
  await flushPromises();
  return { wrapper, vm: wrapper.vm as unknown as PageVm };
}

beforeEach(() => {
  vi.clearAllMocks();
  http.get.mockResolvedValue({ data: { items: [card], total: 1, page: 1, pageSize: 10 } });
  http.delete.mockResolvedValue({});
  http.patch.mockResolvedValue({});
});

describe("CreditCardsPage", () => {
  it("does not delete when the confirmation is cancelled", async () => {
    const { vm } = await mountPage();
    const pending = vm.remove(card);
    useConfirmStore().answer(false);
    await pending;
    expect(http.delete).not.toHaveBeenCalled();
  });

  it("deletes after confirmation and reloads the list", async () => {
    const { vm } = await mountPage();
    http.get.mockClear();
    const pending = vm.remove(card);
    expect(useConfirmStore().message).toContain("Principal");
    useConfirmStore().answer(true);
    await pending;
    expect(http.delete).toHaveBeenCalledWith("/credit-cards/c1");
    expect(http.get).toHaveBeenCalledWith("/credit-cards", {
      params: { page: 1, pageSize: 10 },
    });
  });

  it("sends the limit as a 2-decimal string", async () => {
    const { vm } = await mountPage();
    vm.edit(card);
    vm.form.limitAmount = "R$ 1.234,50";
    await vm.save();
    expect(http.patch).toHaveBeenCalledWith("/credit-cards/c1", {
      nickname: "Principal",
      brand: "Visa",
      last4: "1234",
      cardType: "credit",
      limitAmount: "1234.50",
    });
  });

  it("creates a debit card without a limit", async () => {
    http.post.mockResolvedValue({});
    const { vm } = await mountPage();
    vm.openNew();
    Object.assign(vm.form, {
      nickname: "Conta",
      brand: "Elo",
      last4: "9999",
      cardType: "debit",
      limitAmount: "",
    });
    await vm.save();
    expect(http.post).toHaveBeenCalledWith("/credit-cards", {
      nickname: "Conta",
      brand: "Elo",
      last4: "9999",
      cardType: "debit",
      limitAmount: null,
    });
  });

  it("only accepts a brand from the list of real brands", async () => {
    const { vm } = await mountPage();
    vm.edit({ ...card, brand: "Sem/B" as typeof card.brand });
    await vm.save();
    expect(http.patch).not.toHaveBeenCalled();
    expect((vm as unknown as { errors: { brand: string[] } }).errors.brand).toEqual([
      "Escolha uma bandeira da lista",
    ]);
  });

  it("asks before converting a credit card to debit", async () => {
    const { vm } = await mountPage();
    vm.edit(card);
    vm.form.cardType = "debit";

    let pending = vm.save();
    await flushPromises();
    expect(useConfirmStore().title).toBe("Mudar para cartão de débito");
    useConfirmStore().answer(false);
    await pending;
    expect(http.patch).not.toHaveBeenCalled();

    pending = vm.save();
    await flushPromises();
    useConfirmStore().answer(true);
    await pending;
    expect(http.patch).toHaveBeenCalledWith(
      "/credit-cards/c1",
      expect.objectContaining({ cardType: "debit", limitAmount: null })
    );
  });
});
