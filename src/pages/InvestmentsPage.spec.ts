import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createVuetify } from "vuetify";
import InvestmentsPage from "./InvestmentsPage.vue";
import type { Investment } from "../types/domain";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock("../plugins/http", () => ({ default: http }));

const cdb: Investment = {
  id: "i1",
  name: "CDB",
  type: "fixed_income",
  institution: "Banco X",
  currentValue: "1050.00",
  investedTotal: "1000.00",
  lastMovementDate: "2026-10-01",
};

type Vm = {
  openNew: () => void;
  save: () => Promise<void>;
  form: { name: string; type: string | null; institution: string };
  errors: { type: string[] };
  openMovements: (i: Investment) => void;
  addMovement: () => Promise<void>;
  movForm: { kind: string; amount: string; date: string };
  movErrors: { amount: string[] };
};

async function mountPage() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(InvestmentsPage, { global: { plugins: [pinia, createVuetify()] } });
  await flushPromises();
  return wrapper.vm as unknown as Vm;
}

beforeEach(() => {
  vi.clearAllMocks();
  http.get.mockImplementation(async (url: string) =>
    url === "/investments"
      ? { data: { items: [cdb], total: 1, page: 1, pageSize: 10 } }
      : { data: [] }
  );
  http.post.mockResolvedValue({ data: {} });
});

describe("InvestmentsPage", () => {
  it("creates an investment with an explicit payload (empty institution → null)", async () => {
    const vm = await mountPage();
    vm.openNew();
    Object.assign(vm.form, { name: " Tesouro Selic ", type: "fixed_income", institution: " " });
    await vm.save();
    expect(http.post).toHaveBeenCalledWith("/investments", {
      name: "Tesouro Selic",
      type: "fixed_income",
      institution: null,
    });
  });

  it("requires the type", async () => {
    const vm = await mountPage();
    vm.openNew();
    vm.form.name = "X";
    await vm.save();
    expect(http.post).not.toHaveBeenCalled();
    expect(vm.errors.type).toEqual(["Escolha o tipo"]);
  });

  it("adds a contribution as a 2-decimal string and refuses zero", async () => {
    const vm = await mountPage();
    vm.openMovements(cdb);
    Object.assign(vm.movForm, { kind: "contribution", amount: "R$ 0,00", date: "2026-10-01" });
    await vm.addMovement();
    expect(http.post).not.toHaveBeenCalled();
    expect(vm.movErrors.amount).toEqual(["O valor deve ser maior que zero"]);

    vm.movForm.amount = "R$ 1.234,50";
    await vm.addMovement();
    expect(http.post).toHaveBeenCalledWith("/investments/i1/movements", {
      kind: "contribution",
      amount: "1234.50",
      date: "2026-10-01",
    });
  });

  it("accepts a zero balance update", async () => {
    const vm = await mountPage();
    vm.openMovements(cdb);
    Object.assign(vm.movForm, { kind: "balance", amount: "R$ 0,00", date: "2026-10-01" });
    await vm.addMovement();
    expect(http.post).toHaveBeenCalledWith("/investments/i1/movements", {
      kind: "balance",
      amount: "0.00",
      date: "2026-10-01",
    });
  });
});
