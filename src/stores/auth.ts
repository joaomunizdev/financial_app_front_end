import { defineStore } from "pinia";
import http from "../plugins/http";

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
      const { data } = await http.post("/auth/login", { email, password });
      this.token = data.accessToken;
      this.email = email;
      localStorage.setItem("token", this.token);
    },
    logout() {
      this.token = "";
      this.email = "";
      localStorage.removeItem("token");
    },
    hydrateFromStorage() {
      const t = localStorage.getItem("token");
      this.token = t || "";
    },
  },
});

export { default as http } from "../plugins/http";
