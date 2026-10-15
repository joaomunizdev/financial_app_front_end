import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createVuetify } from "vuetify";
import StatementsPage from "./StatementsPage.vue";
import { useToastStore } from "../stores/toast";
import type { Statement } from "../types/domain";

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("../plugins/http", () => ({ default: http }));

const openStatement: Statement = {
  id: "s1",
  creditCardId: "c1",
  year: 2025,
  month: 8,
  closingDate: null,
  dueDate: null,
  totalAmount: "100.00",
  adjustmentAmount: "0.00",
  locked: false,
  paidAt: null,
  paidAmount: null,
};

type PageVm = {
  toggleLock: (st: Statement) => Promise<void>;
  openPay: (st: Statement) => void;
  confirmPay: () => Promise<void>;
};

async function mountPage() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(StatementsPage, {
    global: { plugins: [pinia, createVuetify()] },
  });
  await flushPromises();
  return wrapper.vm as unknown as PageVm;
}

beforeEach(() => {
  vi.clearAllMocks();
  http.get.mockImplementation(async (url: string) => ({
    data:
      url === "/statements"
        ? { items: [openStatement], total: 1, page: 1, pageSize: 10 }
        : [],
  }));
  http.patch.mockResolvedValue({ data: { ...openStatement, locked: true } });
  http.post.mockResolvedValue({ data: {} });
});

describe("StatementsPage", () => {
  it("closes an open statement silently before paying it", async () => {
    const vm = await mountPage();
    vm.openPay(openStatement);
    await vm.confirmPay();

    expect(http.patch).toHaveBeenCalledWith(
      "/statements/s1",
      { locked: true },
      { skipToast: true }
    );
    expect(http.post).toHaveBeenCalledWith("/statements/s1/pay", {
      amount: "100.00",
      paidAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    expect(http.patch.mock.invocationCallOrder[0]).toBeLessThan(
      http.post.mock.invocationCallOrder[0]
    );
  });

  it("pays a closed statement without locking it again", async () => {
    const vm = await mountPage();
    vm.openPay({ ...openStatement, locked: true });
    await vm.confirmPay();

    expect(http.patch).not.toHaveBeenCalled();
    expect(http.post).toHaveBeenCalledWith("/statements/s1/pay", expect.anything());
  });

  it("reports closing and reopening with specific messages", async () => {
    const vm = await mountPage();
    const toast = useToastStore();

    await vm.toggleLock(openStatement);
    expect(http.patch).toHaveBeenCalledWith(
      "/statements/s1",
      { locked: true },
      { skipToast: true }
    );
    expect(toast.message).toBe("Fatura fechada com sucesso.");

    toast.hide();
    await vm.toggleLock({ ...openStatement, locked: true });
    await new Promise((r) => setTimeout(r, 250)); // queued toast switch
    expect(toast.message).toBe("Fatura reaberta com sucesso.");
  });
});
