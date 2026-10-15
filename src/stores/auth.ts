import { defineStore } from "pinia";
import http from "../plugins/http";
import { useToastStore } from "./toast";
import { decodeJwtPayload, isTokenExpired } from "../utils/jwt";

const TOKEN_KEY = "token";

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  /** Digits only. */
  cpf: string;
  /** Digits only, with area code. */
  phone: string;
  birthDate: string;
};

type LoginResponse = {
  accessToken?: string;
  twoFactorRequired?: boolean;
  challengeToken?: string;
  emailVerificationRequired?: boolean;
  email?: string;
};

export type LoginResult =
  | { status: "authenticated" }
  | { status: "two_factor"; challengeToken: string }
  | { status: "verify_email"; email: string };
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
    /** E-mail from the token payload (`{ sub, email }`), so it survives page reloads. */
    userEmail: (s): string => {
      const email = s.token ? decodeJwtPayload(s.token)?.email : null;
      return typeof email === "string" ? email : s.email;
    },
  },
  actions: {
    async register(input: RegisterInput) {
      // The account only becomes usable after the e-mailed code is confirmed.
      await http.post("/auth/register", input, { skipToast: true });
      useToastStore().show({
        message: "Enviamos um código de confirmação para o seu e-mail.",
      });
    },
    /**
     * Password step. Signs in, or tells the caller which code step comes next.
     * Wrong credentials show a toast and re-throw.
     */
    async login(email: string, password: string): Promise<LoginResult> {
      try {
        const { data } = await http.post<LoginResponse>("/auth/login", { email, password });
        if (data.twoFactorRequired && data.challengeToken) {
          return { status: "two_factor", challengeToken: data.challengeToken };
        }
        if (data.emailVerificationRequired) {
          return { status: "verify_email", email: data.email ?? email };
        }
        await this.startSession(data.accessToken!, email);
        return { status: "authenticated" };
      } catch (error) {
        useToastStore().show({
          message: "Não foi possível realizar o login. Verifique e-mail e senha.",
          color: "error",
        });
        throw error;
      }
    },
    /** Confirms the sign-up code and signs in. Errors are left to the caller. */
    async verifyEmail(email: string, code: string) {
      const { data } = await http.post<{ accessToken: string }>(
        "/auth/verify-email",
        { email, code },
        { skipToast: true }
      );
      await this.startSession(data.accessToken, email);
    },
    async resendVerification(email: string) {
      await http.post("/auth/resend-verification", { email }, { skipToast: true });
    },
    /** Second-factor login step. Errors are left to the caller. */
    async verifyLogin(challengeToken: string, code: string, email: string) {
      const { data } = await http.post<{ accessToken: string }>(
        "/auth/login/verify",
        { challengeToken, code },
        { skipToast: true }
      );
      await this.startSession(data.accessToken, email);
    },
    async resendLoginCode(challengeToken: string) {
      await http.post("/auth/login/resend", { challengeToken }, { skipToast: true });
    },
    async startSession(accessToken: string, email: string) {
      this.token = accessToken;
      this.email = email;
      localStorage.setItem(TOKEN_KEY, this.token);
      useToastStore().show({ message: "Login realizado com sucesso.", color: "success" });
      await wait(TOAST_BEFORE_RELOAD_MS);
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
