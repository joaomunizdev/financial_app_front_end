import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createVuetify } from "vuetify";
import ReportsPage from "./ReportsPage.vue";
import type { TenantReport } from "../types/domain";

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../plugins/http", () => ({ default: http }));

const report = (tenantName: string, values: Partial<TenantReport>): TenantReport => ({
  tenantId: tenantName,
  tenantName,
  purchasesTotal: "0.00",
  subscriptionsTotal: "0.00",
  reportExpensesTotal: "0.00",
  fixedExpensesTotal: "0.00",
  incomeSourcesTotal: "0.00",
  accumulatedAmount: "0.00",
  ...values,
});

type Vm = {
  tenantId: string | null;
  visibleRows: { tenantName: string }[];
  expenseBars: { label: string; total: number }[];
  clearFilter: () => Promise<void>;
  rows: { tenantName: string; expenses: number; balance: number }[];
  totals: { expenses: number; income: number; balance: number };
  summary: { label: string; value: string; tone?: string }[];
  downloadOne: (row: { tenantId: string; tenantName: string }) => Promise<void>;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() });
  http.get.mockImplementation(async (url: string) => {
    if (url === "/reports/by-tenant") {
      return {
        data: [
          report("Ana", { purchasesTotal: "100.00", subscriptionsTotal: "20.00", fixedExpensesTotal: "80.00", incomeSourcesTotal: "500.00", accumulatedAmount: "300.00" }),
          report("Bia", { purchasesTotal: "350.50", accumulatedAmount: "-350.50" }),
          report("Caio", {}),
        ],
      };
    }
    if (url === "/reports/by-category") return { data: [{ categoryId: "c1", name: "Mercado", icon: null, totalAmount: "450.50" }] };
    if (url === "/tenants") return { data: [{ id: "Ana", name: "Ana" }, { id: "Bia", name: "Bia" }, { id: "Caio", name: "Caio" }] };
    return { data: new Blob(["%PDF"]) };
  });
});

async function mountPage() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(ReportsPage, { global: { plugins: [pinia, createVuetify()], stubs: { RouterLink: true } } });
  await flushPromises();
  return { wrapper, vm: wrapper.vm as unknown as Vm };
}

describe("ReportsPage", () => {
  it("shows every tenant with movement, with expenses and a signed balance", async () => {
    const { vm } = await mountPage();
    expect(vm.rows.map((r) => [r.tenantName, r.expenses, r.balance])).toEqual([
      ["Ana", 200, 300],
      ["Bia", 350.5, -350.5],
    ]);
    expect(vm.totals).toMatchObject({ expenses: 550.5, income: 500, balance: -50.5 });
    expect(vm.expenseBars.map((b) => b.label)).toEqual(["Bia", "Ana"]);
  });

  it("summarizes the month with the balance tone", async () => {
    const { vm } = await mountPage();
    const balance = vm.summary.find((s) => s.label === "Saldo do mês")!;
    expect(balance.value).toMatch(/-\s?R\$\s?50,50/);
    expect(balance.tone).toBe("negative");
    expect(vm.summary.find((s) => s.label === "Responsáveis com movimento")!.value).toBe("2");
  });

  it("filters by tenant: rows, summary, composition and categories from the API", async () => {
    const { vm } = await mountPage();
    vm.tenantId = "Ana";
    await flushPromises();
    expect(vm.visibleRows.map((r) => r.tenantName)).toEqual(["Ana"]);
    expect(vm.totals).toMatchObject({ expenses: 200, income: 500, balance: 300 });
    expect(vm.summary.find((s) => s.label === "Responsável")?.value).toBe("Ana");
    expect(vm.expenseBars.map((b) => [b.label, b.total])).toEqual([
      ["Compras", 100],
      ["Assinaturas", 20],
      ["Despesas fixas", 80],
    ]);
    expect(http.get).toHaveBeenLastCalledWith("/reports/by-category", {
      params: expect.objectContaining({ tenantId: "Ana" }),
    });

    await vm.clearFilter();
    expect(vm.tenantId).toBeNull();
    expect(vm.visibleRows).toHaveLength(2);
  });

  it("downloads the PDF of one tenant for the month on screen", async () => {
    const { vm } = await mountPage();
    vi.useFakeTimers();
    const pending = vm.downloadOne({ tenantId: "Ana", tenantName: "Ana" });
    await vi.runAllTimersAsync();
    await pending;
    vi.useRealTimers();
    const now = new Date();
    expect(http.get).toHaveBeenCalledWith("/reports/tenants/Ana/monthly-pdf", {
      params: { year: now.getFullYear(), month: now.getMonth() + 1 },
      responseType: "blob",
      skipToast: true,
    });
  });
});
