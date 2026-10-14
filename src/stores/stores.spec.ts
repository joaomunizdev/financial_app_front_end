import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useToastStore } from "./toast";
import { useConfirmStore } from "./confirm";
import { useAuthStore } from "./auth";
import { fakeJwt } from "../test/helpers";

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("toast store", () => {
  it("queues messages shown while another is visible", () => {
    vi.useFakeTimers();
    const toast = useToastStore();

    toast.show({ message: "primeiro" });
    toast.show({ message: "segundo", color: "error" });
    expect(toast.message).toBe("primeiro");

    toast.hide();
    expect(toast.visible).toBe(false);
    vi.runAllTimers();

    expect(toast.visible).toBe(true);
    expect(toast.message).toBe("segundo");
    expect(toast.color).toBe("error");
  });
});

describe("confirm store", () => {
  it("resolves with the user's answer", async () => {
    const confirm = useConfirmStore();
    const pending = confirm.ask({ title: "Excluir", message: "Tem certeza?" });
    expect(confirm.visible).toBe(true);
    confirm.answer(true);
    await expect(pending).resolves.toBe(true);
    expect(confirm.visible).toBe(false);
  });

  it("cancels a pending question when a new one is asked", async () => {
    const confirm = useConfirmStore();
    const first = confirm.ask({ title: "A", message: "a" });
    const second = confirm.ask({ title: "B", message: "b" });
    await expect(first).resolves.toBe(false);
    confirm.answer(true);
    await expect(second).resolves.toBe(true);
  });
});

describe("auth store", () => {
  const valid = () => fakeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
  const expired = () => fakeJwt({ exp: Math.floor(Date.now() / 1000) - 60 });

  it("restores a valid stored token", () => {
    const token = valid();
    localStorage.setItem("token", token);
    const auth = useAuthStore();
    expect(auth.token).toBe(token);
    expect(auth.isAuthenticated).toBe(true);
  });

  it("drops an expired stored token", () => {
    localStorage.setItem("token", expired());
    const auth = useAuthStore();
    expect(auth.isAuthenticated).toBe(false);
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("syncSession picks up expiry and logout from other tabs", () => {
    localStorage.setItem("token", valid());
    const auth = useAuthStore();

    localStorage.setItem("token", expired());
    auth.syncSession();
    expect(auth.isAuthenticated).toBe(false);

    localStorage.setItem("token", valid());
    auth.syncSession();
    expect(auth.isAuthenticated).toBe(true);
    localStorage.removeItem("token");
    auth.syncSession();
    expect(auth.isAuthenticated).toBe(false);
  });
});
