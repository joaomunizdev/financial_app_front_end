import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import BarList from "./BarList.vue";
import MonthlySpendingChart from "./MonthlySpendingChart.vue";

const global = { plugins: [createVuetify()] };
const nbsp = (s: string) => s.replace(/ /g, " ");

describe("BarList", () => {
  it("draws bars relative to the largest value with value and share labels", () => {
    const wrapper = mount(BarList, {
      global,
      props: {
        listLabel: "Gastos",
        items: [
          { id: "a", label: "Principal", total: 300 },
          { id: "b", label: "Viagem", total: 100 },
        ],
      },
    });
    const bars = wrapper.findAll(".bar-row__bar");
    expect(bars[0].attributes("style")).toContain("width: 100%");
    expect(bars[1].attributes("style")).toContain("width: 33.3");
    expect(nbsp(wrapper.text())).toContain("R$ 300,00 · 75%");
    expect(nbsp(wrapper.text())).toContain("R$ 100,00 · 25%");
  });

  it("shows the empty slot without data", () => {
    const wrapper = mount(BarList, {
      global,
      props: { listLabel: "Gastos", items: [] },
      slots: { empty: "Nada aqui" },
    });
    expect(wrapper.text()).toBe("Nada aqui");
  });
});

describe("MonthlySpendingChart", () => {
  const months = [
    { year: 2026, month: 9, label: "set", total: 800 },
    { year: 2026, month: 10, label: "out", total: 1250.75 },
  ];

  it("highlights only the last month and labels its value", () => {
    const wrapper = mount(MonthlySpendingChart, { global, props: { months } });
    expect(wrapper.findAll(".monthly-chart__col--current")).toHaveLength(1);
    expect(wrapper.findAll(".monthly-chart__col")).toHaveLength(1);
    expect(nbsp(wrapper.find(".monthly-chart__value").text())).toBe("R$ 1.250,75");
    expect(wrapper.find("svg").attributes("aria-label")).toContain("set");
  });

  it("shows a tooltip on hover", async () => {
    const wrapper = mount(MonthlySpendingChart, { global, props: { months } });
    await wrapper.findAll("rect")[0].trigger("mouseenter");
    expect(nbsp(wrapper.find(".monthly-chart__tooltip").text())).toBe("set/2026: R$ 800,00");
  });
});
