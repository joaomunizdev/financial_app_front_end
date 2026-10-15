import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import { createRouter, createMemoryHistory } from "vue-router";
import InvestmentsOverview from "./InvestmentsOverview.vue";
import type { InvestmentsSummary } from "../types/domain";

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/:p(.*)*", component: { template: "<div/>" } }] });

const summary: InvestmentsSummary = {
  totalValue: "10000.00",
  contributions: "1200.00",
  withdrawals: "0.00",
  investmentsCount: 3,
  history: [
    { year: 2026, month: 9, value: "8000.00" },
    { year: 2026, month: 10, value: "10000.00" },
  ],
  byType: [
    { type: "fixed_income", value: "7500.00" },
    { type: "crypto", value: "2500.00" },
  ],
};

function mountIt(s: InvestmentsSummary | null) {
  return mount(InvestmentsOverview, {
    props: { summary: s, monthName: "outubro" },
    global: { plugins: [createVuetify(), router] },
  });
}

describe("InvestmentsOverview", () => {
  it("shows the total, the month's contributions and the mix with shares and values", () => {
    const text = mountIt(summary).text().replace(/\s+/g, " ");
    expect(text).toContain("R$ 10.000,00");
    expect(text).toContain("R$ 1.200,00 aportados em outubro");
    expect(text).toMatch(/Renda fixa\s*75%\s*R\$ 7\.500,00/);
    expect(text).toMatch(/Criptomoedas\s*25%\s*R\$ 2\.500,00/);
  });

  it("keeps each type's color whatever else is in the portfolio", () => {
    const w = mountIt({ ...summary, byType: [{ type: "crypto", value: "1.00" }] });
    const seg = w.find(".inv-bar__seg");
    expect(seg.attributes("style")).toContain("#e87ba4"); // crypto's slot, not the first color
  });

  it("invites to register investments when there are none", () => {
    expect(mountIt({ ...summary, investmentsCount: 0 }).text()).toContain("Cadastrar investimento");
  });
});
