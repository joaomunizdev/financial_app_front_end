import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import EmptyState from "./EmptyState.vue";

const global = { plugins: [createVuetify()] };

describe("EmptyState", () => {
  it("renders the illustration, copy and emits the action", async () => {
    const wrapper = mount(EmptyState, {
      global,
      props: {
        image: "/empty.webp",
        title: "Cadastre seu primeiro cartão",
        description: "Cartões aparecem nas compras.",
        actionText: "Novo cartão",
      },
    });
    expect(wrapper.find("img").attributes("src")).toBe("/empty.webp");
    expect(wrapper.find("img").attributes("alt")).toBe("");
    expect(wrapper.find("h3").text()).toBe("Cadastre seu primeiro cartão");
    expect(wrapper.text()).toContain("Cartões aparecem nas compras.");

    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("action")).toHaveLength(1);
  });

  it("omits the button without an action", () => {
    const wrapper = mount(EmptyState, {
      global,
      props: { image: "/empty.webp", title: "Nada aqui" },
    });
    expect(wrapper.find("button").exists()).toBe(false);
  });
});
