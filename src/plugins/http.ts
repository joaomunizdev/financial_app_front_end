import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";
import { withDetail } from "../utils/api-error";

type ToastAction = "create" | "update" | "delete" | "pay";
type ToastMeta = { action: ToastAction; entity: string };

declare module "axios" {
  interface AxiosRequestConfig {
    /** Disables automatic success/error toasts; the caller handles feedback. */
    skipToast?: boolean;
  }
  interface InternalAxiosRequestConfig {
    toastMeta?: ToastMeta | null;
  }
}

// Order matters: the first match wins.
const ENTITY_MATCHERS: Array<{
  matcher: RegExp;
  entity: string;
  action?: ToastAction;
}> = [
  { matcher: /\/statements\/[^/?]+\/pay\b/i, entity: "Fatura", action: "pay" },
  { matcher: /\/statements\b/i, entity: "Fatura" },
  { matcher: /\/subscriptions\b/i, entity: "Assinatura" },
  { matcher: /\/purchases\b/i, entity: "Compra" },
  { matcher: /\/credit-cards\b/i, entity: "Cartão" },
  { matcher: /\/fixed-expenses\b/i, entity: "Despesa fixa" },
  { matcher: /\/income-sources\b/i, entity: "Fonte de renda" },
  { matcher: /\/tenants\b/i, entity: "Responsável" },
  { matcher: /\/auth\/register\b/i, entity: "Usuário" },
  { matcher: /\/users\b/i, entity: "Usuário" },
];

const ACTION_TITLES: Record<ToastAction, string> = {
  create: "cadastro",
  update: "edição",
  delete: "exclusão",
  pay: "pagamento",
};

function resolveAction(method?: string): ToastAction | null {
  const normalized = method?.toLowerCase();
  if (normalized === "post") return "create";
  if (normalized === "put" || normalized === "patch") return "update";
  if (normalized === "delete") return "delete";
  return null;
}

function extractToastMeta(config: InternalAxiosRequestConfig): ToastMeta | null {
  const methodAction = resolveAction(config.method);
  if (!methodAction) return null;
  const target = `${config.baseURL ?? ""}${config.url ?? ""}`;
  const found = ENTITY_MATCHERS.find(({ matcher }) => matcher.test(target));
  if (!found) return null;
  return { action: found.action ?? methodAction, entity: found.entity };
}

function buildMessage(meta: ToastMeta, success: boolean) {
  const actionLabel = ACTION_TITLES[meta.action];
  if (success) {
    return `O processo de ${actionLabel} de ${meta.entity} foi concluído com sucesso.`;
  }
  return `Não foi possível concluir o processo de ${actionLabel} de ${meta.entity}.`;
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  withCredentials: false,
});

http.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`;
  config.toastMeta = config.skipToast ? null : extractToastMeta(config);
  return config;
});

let redirectingToLogin = false;

http.interceptors.response.use(
  (res) => {
    const meta = res.config.toastMeta;
    if (meta) {
      useToastStore().show({ message: buildMessage(meta, true), color: "success" });
    }
    return res;
  },
  async (err: AxiosError) => {
    const config = err.config;
    const status = err.response?.status;

    if (status === 401) {
      const auth = useAuthStore();
      // Login failures are reported by the auth store; other 401s mean the session ended.
      if (auth.token && !redirectingToLogin) {
        redirectingToLogin = true;
        auth.clearSession();
        if (location.pathname !== "/login") location.assign("/login");
      }
      return Promise.reject(err);
    }

    if (config && !config.skipToast) {
      const meta = config.toastMeta;
      const isRead = (config.method ?? "get").toLowerCase() === "get";
      if (meta) {
        useToastStore().show({ message: withDetail(buildMessage(meta, false), err), color: "error" });
      } else if (isRead) {
        useToastStore().show({
          message: withDetail("Não foi possível carregar os dados.", err),
          color: "error",
        });
      }
    }
    return Promise.reject(err);
  }
);

export default http;
