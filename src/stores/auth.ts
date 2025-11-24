import { defineStore } from "pinia";
import http, { REQUEST_DELAY_MS } from "../plugins/http";
import { useToastStore } from "./toast";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("token") || "",
    email: "",
  }),
  getters: {
    isAuthenticated: (s) => !!s.token,
  },
  actions: {
    async register(name: string, email: string, password: string) {
      await http.post("/auth/register", { name, email, password });
    },
    async login(email: string, password: string) {
      const toast = useToastStore();
      try {
        const { data } = await http.post("/auth/login", { email, password });
        this.token = data.accessToken;
        this.email = email;
        localStorage.setItem("token", this.token);
        toast.show({
          message: "Login realizado com sucesso.",
          color: "success",
        });
        await wait(REQUEST_DELAY_MS);
      } catch (error) {
        toast.show({
          message: "Não foi possível realizar o login.",
          color: "error",
        });
        throw error;
      }
    },
    async logout(options?: { silent?: boolean }) {
      const toast = useToastStore();
      this.token = "";
      this.email = "";
      localStorage.removeItem("token");
      if (!options?.silent) {
        toast.show({
          message: "Logout realizado com sucesso.",
          color: "success",
        });
        await wait(REQUEST_DELAY_MS);
      }
    },
    hydrateFromStorage() {
      const t = localStorage.getItem("token");
      this.token = t || "";
    },
  },
});

export { default as http } from "../plugins/http";
