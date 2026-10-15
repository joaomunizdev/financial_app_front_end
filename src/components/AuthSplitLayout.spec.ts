import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import AuthSplitLayout from "./AuthSplitLayout.vue";

describe("AuthSplitLayout", () => {
  it("renders the illustration message, heading, form slot and footer", () => {
    const wrapper = mount(AuthSplitLayout, {
      global: { plugins: [createVuetify()] },
      props: {
        image: "/banner.webp",
        title: "Faturas sob controle.",
        description: "Gere, feche e registre pagamentos.",
        heading: "Seja bem-vindo",
        subheading: "Acesse sua conta.",
      },
      slots: { default: "<form>campos</form>", footer: "Criar conta" },
    });

    expect(wrapper.find(".auth-split__visual").attributes("style")).toContain("/banner.webp");
    expect(wrapper.find(".auth-split__title").text()).toBe("Faturas sob controle.");
    expect(wrapper.find("h1").text()).toBe("Seja bem-vindo");
    expect(wrapper.text()).toContain("Acesse sua conta.");
    expect(wrapper.find("form").text()).toBe("campos");
    expect(wrapper.text()).toContain("Criar conta");
  });
});
