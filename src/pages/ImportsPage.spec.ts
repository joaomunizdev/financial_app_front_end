import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createVuetify } from "vuetify";
import ImportsPage from "./ImportsPage.vue";
import { useConfirmStore } from "../stores/confirm";
import type { ImportPreview } from "../types/domain";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../plugins/http", () => ({ default: http }));

const preview: ImportPreview = {
  kind: "statement",
  bank: "nubank",
  bankName: "Nubank",
  format: "ofx",
  period: { from: "2026-09-01", to: "2026-09-02" },
  expectedTotal: null,
  readTotal: "12.50",
  warnings: [],
  lines: [
    { key: "k1", date: "2026-09-01", description: "Padaria", amount: "12.50", direction: "debit", installment: null, suggestedAction: "purchase", reason: null, duplicateOf: null, categoryId: "cat-food" },
    { key: "k2", date: "2026-09-01", description: "Salário", amount: "5000.00", direction: "credit", installment: null, suggestedAction: "income", reason: null, duplicateOf: null, categoryId: null },
    { key: "k3", date: "2026-09-02", description: "Pagamento de fatura", amount: "300.00", direction: "debit", installment: null, suggestedAction: "ignore", reason: "card_payment", duplicateOf: null, categoryId: null },
  ],
};

type Vm = {
  kind: string;
  file: File | null;
  creditCardId: string | null;
  fileError: string;
  cardError: string;
  tenantError: string;
  defaultTenantId: string | null;
  paymentMethod: string;
  rows: { key: string; action: string; tenantId: string | null }[];
  readFile: () => Promise<void>;
  confirmImport: () => Promise<void>;
};

async function mountPage() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(ImportsPage, { global: { plugins: [pinia, createVuetify()], stubs: { RouterLink: true } } });
  await flushPromises();
  return { wrapper, vm: wrapper.vm as unknown as Vm };
}

beforeEach(() => {
  vi.clearAllMocks();
  http.get.mockImplementation(async (url: string) => ({
    data:
      url === "/tenants"
        ? [{ id: "t1", name: "Ana" }, { id: "t2", name: "Bia" }]
        : url === "/credit-cards"
          ? [{ id: "c1", nickname: "Visa", cardType: "credit" }]
          : [],
  }));
});

describe("ImportsPage", () => {
  it("asks for a file, and for the card on invoices", async () => {
    const { vm } = await mountPage();
    await vm.readFile();
    expect(vm.fileError).toBe("Escolha um arquivo.");
    vm.kind = "invoice";
    await flushPromises();
    vm.file = new File(["x"], "fatura.pdf");
    await vm.readFile();
    expect(vm.cardError).toBe("Escolha o cartão da fatura.");
    expect(http.post).not.toHaveBeenCalled();
  });

  it("uploads the file and starts each row with the suggested action", async () => {
    http.post.mockResolvedValueOnce({ data: preview });
    const { vm, wrapper } = await mountPage();
    vm.file = new File(["<OFX>"], "extrato.ofx");
    await vm.readFile();
    const [url, body, config] = http.post.mock.calls[0];
    expect(url).toBe("/imports/preview");
    expect((body as FormData).get("kind")).toBe("statement");
    expect((body as FormData).get("file")).toBeInstanceOf(File);
    expect(config).toEqual({ skipToast: true });
    expect(vm.rows.map((r) => r.action)).toEqual(["purchase", "income", "ignore"]);
    await flushPromises();
    expect(wrapper.text()).toContain("Pagamento de fatura");
  });

  it("shows the reason in Portuguese when the file is not recognized", async () => {
    http.post.mockRejectedValueOnce({ isAxiosError: true, response: { status: 422, data: { message: "Unrecognized file" } } });
    const { vm } = await mountPage();
    vm.file = new File(["?"], "x.txt");
    await vm.readFile();
    expect(vm.fileError).toBe("Não reconhecemos esse arquivo. Confira os formatos aceitos.");
  });

  it("requires a tenant and sends only the lines to import", async () => {
    http.post.mockResolvedValueOnce({ data: preview }).mockResolvedValueOnce({ data: { purchases: 1, incomes: 1, skipped: 0 } });
    const { vm } = await mountPage();
    vm.file = new File(["<OFX>"], "extrato.ofx");
    await vm.readFile();

    await vm.confirmImport();
    expect(vm.tenantError).toBe("Escolha o responsável (ou um em cada linha).");

    vm.defaultTenantId = "t1";
    vm.rows[1].tenantId = "t2";
    vm.paymentMethod = "cash";
    const pending = vm.confirmImport();
    await flushPromises();
    useConfirmStore().answer(true);
    await pending;
    expect(http.post).toHaveBeenLastCalledWith(
      "/imports/confirm",
      {
        kind: "statement",
        lines: [
          { key: "k1", action: "purchase", date: "2026-09-01", description: "Padaria", amount: "12.50", installment: null, tenantId: "t1", categoryId: "cat-food", paymentMethod: "cash" },
          { key: "k2", action: "income", date: "2026-09-01", description: "Salário", amount: "5000.00", installment: null, tenantId: "t2", categoryId: null },
        ],
      },
      { skipToast: true }
    );
  });
});
