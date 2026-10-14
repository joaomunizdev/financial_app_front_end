import { defineStore } from "pinia";
import http from "../plugins/http";
import { useToastStore } from "./toast";
import { isTokenExpired } from "../utils/jwt";

const TOKEN_KEY = "token";
// Login and logout reload the page right after; this keeps their toast visible first.
const TOAST_BEFORE_RELOAD_MS = 900;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Stored token, or "" when missing/expired (an expired token is removed). */
function readValidToken(): string {
  const token = localStorage.getItem(TOKEN_KEY) || "";
  if (token && isTokenExpired(token)) {
    localStorage.removeItem(TOKEN_KEY);
    return "";
  }
  return token;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: readValidToken(),
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
        const { data } = await http.post<{ accessToken: string }>(
          "/auth/login",
          { email, password }
        );
        this.token = data.accessToken;
        this.email = email;
        localStorage.setItem(TOKEN_KEY, this.token);
        toast.show({
          message: "Login realizado com sucesso.",
          color: "success",
        });
        await wait(TOAST_BEFORE_RELOAD_MS);
      } catch (error) {
        toast.show({
          message: "Não foi possível realizar o login. Verifique e-mail e senha.",
          color: "error",
        });
        throw error;
      }
    },
    async logout(options?: { silent?: boolean }) {
      this.clearSession();
      if (!options?.silent) {
        useToastStore().show({
          message: "Logout realizado com sucesso.",
          color: "success",
        });
        await wait(TOAST_BEFORE_RELOAD_MS);
      }
    },
    clearSession() {
      this.token = "";
      this.email = "";
      localStorage.removeItem(TOKEN_KEY);
    },
    /** Re-reads the stored token, dropping it if expired (also reflects logout in other tabs). */
    syncSession() {
      this.token = readValidToken();
    },
  },
});

export { default as http } from "../plugins/http";
