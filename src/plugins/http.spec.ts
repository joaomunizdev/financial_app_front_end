import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import http from "./http";
import { useToastStore } from "../stores/toast";
import { useAuthStore } from "../stores/auth";
import { useConnectionStore } from "../stores/connection";
import { fakeJwt } from "../test/helpers";

let lastConfig: InternalAxiosRequestConfig | null = null;

/** Replaces the network with a canned response (status >= 400 rejects like axios does). */
function respondWith(status: number, data: unknown = {}) {
  const adapter: AxiosAdapter = async (config) => {
    lastConfig = config;
    const response = { status, data, statusText: "", headers: {}, config };
    if (status >= 400) {
      throw new AxiosError("fail", String(status), config, null, response);
    }
    return response;
  };
  http.defaults.adapter = adapter;
}

const assign = vi.fn();

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  lastConfig = null;
  assign.mockClear();
  vi.stubGlobal("location", { pathname: "/dashboard", assign });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("http interceptors", () => {
  it("sends the bearer token", async () => {
    const token = fakeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    localStorage.setItem("token", token);
    respondWith(200, []);
    await http.get("/tenants");
    expect(lastConfig?.headers.Authorization).toBe(`Bearer ${token}`);
  });

  it("shows a success toast for known mutations without delaying the response", async () => {
    vi.useFakeTimers();
    respondWith(201);
    // Resolves without advancing timers: the old 900 ms delay is gone.
    await http.post("/tenants", { name: "Ana" });
    vi.useRealTimers();
    const toast = useToastStore();
    expect(toast.color).toBe("success");
    expect(toast.message).toContain("cadastro de Responsável");
  });

  it("labels statement payments and subscriptions", async () => {
    respondWith(201);
    await http.post("/statements/abc/pay", { amount: "10.00" });
    expect(useToastStore().message).toContain("pagamento de Fatura");

    setActivePinia(createPinia());
    await http.patch("/subscriptions/abc", { active: false });
    expect(useToastStore().message).toContain("edição de Assinatura");
  });

  it("includes the backend message in error toasts", async () => {
    respondWith(403, { message: "Tenant has purchases" });
    await expect(http.delete("/tenants/1")).rejects.toBeInstanceOf(AxiosError);
    const toast = useToastStore();
    expect(toast.color).toBe("error");
    expect(toast.message).toBe(
      "Não foi possível concluir o processo de exclusão de Responsável. Tenant has purchases"
    );
  });

  it("reports failed reads", async () => {
    respondWith(500);
    await expect(http.get("/tenants")).rejects.toBeInstanceOf(AxiosError);
    expect(useToastStore().message).toBe(
      "Não foi possível carregar os dados. Erro interno do servidor."
    );
  });

  it("respects skipToast", async () => {
    respondWith(409, { message: "exists" });
    await expect(
      http.post("/statements", {}, { skipToast: true })
    ).rejects.toBeInstanceOf(AxiosError);
    expect(useToastStore().visible).toBe(false);
  });

  it("ends the session and redirects on 401", async () => {
    localStorage.setItem("token", fakeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    respondWith(401);
    await expect(http.get("/tenants")).rejects.toBeInstanceOf(AxiosError);
    expect(useAuthStore().isAuthenticated).toBe(false);
    expect(localStorage.getItem("token")).toBeNull();
    expect(assign).toHaveBeenCalledWith("/login");
    expect(useToastStore().visible).toBe(false);
  });

  it("flags the connection as offline when the server does not answer", async () => {
    http.defaults.adapter = async (config) => {
      throw new AxiosError("Network Error", AxiosError.ERR_NETWORK, config);
    };
    await expect(http.get("/tenants")).rejects.toBeInstanceOf(AxiosError);
    expect(useConnectionStore().offline).toBe(true);

    respondWith(200, []);
    await http.get("/tenants");
    expect(useConnectionStore().offline).toBe(false);
  });

  it("does not flag offline for HTTP errors", async () => {
    respondWith(500);
    await expect(http.get("/tenants")).rejects.toBeInstanceOf(AxiosError);
    expect(useConnectionStore().offline).toBe(false);
  });
});
