import { isAxiosError } from "axios";

type ApiErrorBody = { message?: unknown };

/**
 * User-facing detail for a failed request, or null when there is nothing useful to show.
 * Only 4xx messages are surfaced: they describe what the user can fix (validation, conflicts).
 */
export function extractApiErrorDetail(error: unknown): string | null {
  if (!isAxiosError(error)) return null;
  if (!error.response) return "Não foi possível conectar ao servidor.";

  const { status } = error.response;
  if (status >= 500) return "Erro interno do servidor.";

  const { message } = (error.response.data ?? {}) as ApiErrorBody;
  if (Array.isArray(message)) {
    const parts = message.filter((m): m is string => typeof m === "string");
    return parts.length ? parts.join("; ") : null;
  }
  return typeof message === "string" && message ? message : null;
}

export function withDetail(base: string, error: unknown): string {
  const detail = extractApiErrorDetail(error);
  return detail ? `${base} ${detail}` : base;
}
