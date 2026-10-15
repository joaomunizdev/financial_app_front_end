import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createVuetify } from "vuetify";
import DashboardPage from "./DashboardPage.vue";

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../plugins/http", () => ({ default: http }));

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth() + 1;
const day = `${year}-${String(month).padStart(2, "0")}-05`;

beforeEach(() => {
  vi.clearAllMocks();
  http.get.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
    const params = config?.params ?? {};
    if (url === "/statements") {
      return { data: [{ id: "s1", creditCardId: "c1", year, month, totalAmount: "100.00" }] };
    }
    if (url === "/purchases" && params.page) return { data: { items: [], total: 3, page: 1, pageSize: 1 } };
    if (url === "/purchases" && params.paymentMethod === "pix") {
      return { data: [{ id: "p1", purchaseDate: day, totalAmount: "20.50", paymentMethod: "pix" }] };
    }
    if (url === "/purchases" && params.paymentMethod === "cash") {
      return { data: [{ id: "p2", purchaseDate: day, totalAmount: "9.50", paymentMethod: "cash" }] };
    }
    return { data: [] };
  });
});

describe("DashboardPage", () => {
  it("adds Pix and cash purchases of the month to the month's spending", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mount(DashboardPage, { global: { plugins: [pinia, createVuetify()] } });
    await flushPromises();

    expect(http.get).toHaveBeenCalledWith("/purchases", {
      params: expect.objectContaining({ paymentMethod: "pix", dateEnd: expect.any(String) }),
    });
    expect(wrapper.text()).toMatch(/Gastos no mês\s*R\$\s*130,00/);
  });
});
