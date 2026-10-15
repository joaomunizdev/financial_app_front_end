import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createVuetify } from "vuetify";
import IncomeSourcesPage from "./IncomeSourcesPage.vue";
import type { IncomeSource } from "../types/domain";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock("../plugins/http", () => ({ default: http }));

const salary: IncomeSource = {
  id: "s1",
  tenantId: "t1",
  description: "Salário",
  amount: "5000.00",
  incomeType: "fixed",
  startDate: "2026-01-01",
  endDate: null,
};

type Vm = {
  openNew: () => void;
  edit: (i: IncomeSource) => void;
  save: () => Promise<void>;
  form: { tenantId: string; description: string; amount: string; incomeType: string; startDate: string; endDate: string };
  errors: { startDate: string[]; endDate: string[] };
  periodLabel: (i: IncomeSource) => string;
};

async function mountPage() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(IncomeSourcesPage, { global: { plugins: [pinia, createVuetify()] } });
  await flushPromises();
  return { wrapper, vm: wrapper.vm as unknown as Vm };
}

beforeEach(() => {
  vi.clearAllMocks();
  http.get.mockImplementation(async (url: string) =>
    url === "/income-sources"
      ? { data: { items: [salary], total: 1, page: 1, pageSize: 10 } }
      : { data: [{ id: "t1", name: "Ana" }] }
  );
  http.post.mockResolvedValue({ data: {} });
  http.patch.mockResolvedValue({ data: {} });
});

describe("IncomeSourcesPage", () => {
  it("shows the date or validity of each income in the list", async () => {
    const { wrapper, vm } = await mountPage();
    expect(wrapper.text()).toContain("Desde 01/01/2026");
    expect(vm.periodLabel({ ...salary, startDate: null })).toBe("Sempre");
    expect(vm.periodLabel({ ...salary, endDate: "2026-12-31" })).toBe("01/01/2026 a 31/12/2026");
    expect(vm.periodLabel({ ...salary, incomeType: "one_time", startDate: "2026-10-05" })).toBe("05/10/2026");
  });

  it("sends the receipt date of a one-time income (and no end date)", async () => {
    const { vm } = await mountPage();
    vm.openNew();
    Object.assign(vm.form, {
      tenantId: "t1",
      description: "Freela",
      amount: "R$ 800,00",
      incomeType: "one_time",
      startDate: "2026-10-05",
      endDate: "2026-12-31",
    });
    await vm.save();
    expect(http.post).toHaveBeenCalledWith("/income-sources", {
      tenantId: "t1",
      description: "Freela",
      amount: "800.00",
      incomeType: "one_time",
      startDate: "2026-10-05",
      endDate: null,
    });
  });

  it("requires the receipt date for one-time income", async () => {
    const { vm } = await mountPage();
    vm.openNew();
    Object.assign(vm.form, { tenantId: "t1", description: "X", amount: "R$ 10,00", incomeType: "one_time", startDate: "" });
    await vm.save();
    expect(http.post).not.toHaveBeenCalled();
    expect(vm.errors.startDate).toEqual(["Informe a data de recebimento"]);
  });

  it("edits the dates of a fixed income and refuses an end before the start", async () => {
    const { vm } = await mountPage();
    vm.edit(salary);
    expect(vm.form.startDate).toBe("2026-01-01");

    vm.form.endDate = "2025-12-31";
    await vm.save();
    expect(http.patch).not.toHaveBeenCalled();
    expect(vm.errors.endDate).toEqual(["O fim deve ser igual ou depois do início"]);

    Object.assign(vm.form, { startDate: "2026-03-01", endDate: "2026-12-31" });
    await vm.save();
    expect(http.patch).toHaveBeenCalledWith(
      "/income-sources/s1",
      expect.objectContaining({ startDate: "2026-03-01", endDate: "2026-12-31" })
    );
  });

  it("can clear the start date of a fixed income", async () => {
    const { vm } = await mountPage();
    vm.edit(salary);
    vm.form.startDate = "";
    await vm.save();
    expect(http.patch).toHaveBeenCalledWith(
      "/income-sources/s1",
      expect.objectContaining({ startDate: null, endDate: null })
    );
  });
});
