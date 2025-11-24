import axios, { AxiosRequestConfig } from "axios";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";

type ToastAction = "create" | "update" | "delete";
type ToastMeta = { action: ToastAction; entity: string };

export const REQUEST_DELAY_MS = 900;

const ENTITY_MATCHERS: Array<{ matcher: RegExp; entity: string }> = [
  { matcher: /\/purchases\b/i, entity: "Compra" },
  { matcher: /\/credit-cards\b/i, entity: "Cartão" },
  { matcher: /\/tenants\b/i, entity: "Responsável" },
  { matcher: /\/auth\/register\b/i, entity: "Usuário" },
  { matcher: /\/users\b/i, entity: "Usuário" },
];

const ACTION_TITLES: Record<ToastAction, string> = {
  create: "cadastro",
  update: "edição",
  delete: "exclusão",
};

function resolveAction(method?: string): ToastAction | null {
  const normalized = method?.toLowerCase();
  if (normalized === "post") return "create";
  if (normalized === "put" || normalized === "patch") return "update";
  if (normalized === "delete") return "delete";
  return null;
}

function resolveEntity(config: AxiosRequestConfig): string | null {
  const target = `${config.baseURL ?? ""}${config.url ?? ""}`;
  if (!target) return null;
  const found = ENTITY_MATCHERS.find(({ matcher }) => matcher.test(target));
  return found?.entity ?? null;
}

function extractToastMeta(config: AxiosRequestConfig): ToastMeta | null {
  const action = resolveAction(config.method);
  if (!action) return null;
  const entity = resolveEntity(config);
  if (!entity) return null;
  return { action, entity };
}

function buildMessage(meta: ToastMeta, success: boolean) {
  const actionLabel = ACTION_TITLES[meta.action];
  if (success) {
    return `O processo de ${actionLabel} de ${meta.entity} foi concluído com sucesso.`;
  }
  return `Não foi possível concluir o processo de ${actionLabel} de ${meta.entity}.`;
}

function showToast(meta: ToastMeta, success: boolean) {
  const toast = useToastStore();
  toast.show({
    message: buildMessage(meta, success),
    color: success ? "success" : "error",
  });
}

function delayRequest(meta: ToastMeta | null) {
  if (!meta) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  withCredentials: false,
});

http.interceptors.request.use((config) => {
  const auth = useAuthStore();
  const token = auth.token;
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  const meta = extractToastMeta(config);
  if (meta) (config as any).__toastMeta = meta;
  return config;
});

http.interceptors.response.use(
  async (res) => {
    const meta = ((res.config as any)?.__toastMeta ?? null) as ToastMeta | null;
    if (meta) {
      await delayRequest(meta);
      showToast(meta, true);
    }
    return res;
  },
  async (err) => {
    const meta = ((err.config as any)?.__toastMeta ?? null) as ToastMeta | null;
    if (meta) {
      await delayRequest(meta);
      showToast(meta, false);
    }
    const status = err?.response?.status;
    if (status === 401) {
      const auth = useAuthStore();
      await auth.logout({ silent: true });
      if (location.pathname !== "/login") {
        location.assign("/login");
      }
    }
    return Promise.reject(err);
  }
);

export default http;
