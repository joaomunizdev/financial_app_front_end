import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import CodeVerification from "./CodeVerification.vue";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function mountIt(onResend = vi.fn().mockResolvedValue(undefined)) {
  const wrapper = mount(CodeVerification, {
    global: { plugins: [createVuetify()] },
    props: { email: "ana@example.com", onResend },
  });
  return { wrapper, onResend };
}

describe("CodeVerification", () => {
  it("submits only a complete 6-digit code", async () => {
    const { wrapper } = mountIt();
    const vm = wrapper.vm as unknown as { code: string };
    vm.code = "123";
    await wrapper.find("form").trigger("submit");
    expect(wrapper.emitted("submit")).toBeUndefined();

    vm.code = "123456";
    await wrapper.find("form").trigger("submit");
    await wrapper.find("form").trigger("submit"); // e.g. @finish + Enter
    expect(wrapper.emitted("submit")).toEqual([["123456"]]);

    // after the parent finishes (loading true -> false) a new attempt is allowed
    await wrapper.setProps({ loading: true });
    await wrapper.setProps({ loading: false });
    await wrapper.find("form").trigger("submit");
    expect(wrapper.emitted("submit")).toHaveLength(2);
  });

  it("blocks resending during the 60 s cooldown, then allows it", async () => {
    const { wrapper, onResend } = mountIt();
    const resendBtn = () => wrapper.findAll("button").find((b) => b.text() === "Reenviar código");
    expect(wrapper.text()).toContain("Você pode pedir outro em 60s.");
    expect(resendBtn()).toBeUndefined();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(resendBtn()).toBeDefined();
    await resendBtn()!.trigger("click");
    await flushPromises();
    expect(onResend).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Você pode pedir outro em 60s.");
  });

  it("shows the error message", () => {
    const wrapper = mount(CodeVerification, {
      global: { plugins: [createVuetify()] },
      props: { email: "a@b.c", error: "Código inválido", onResend: vi.fn() },
    });
    expect(wrapper.find('[role="alert"]').text()).toBe("Código inválido");
  });
});
