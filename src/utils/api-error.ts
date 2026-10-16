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
  // Per-IP rate limit of the API (Retry-After says when to try again).
  if (status === 429) return "Muitas tentativas em pouco tempo. Aguarde um pouco e tente de novo.";

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

// Known backend messages of the auth/profile flows, shown in Portuguese.
const AUTH_MESSAGES: Record<string, string> = {
  "Invalid or expired code": "Código inválido ou expirado. Confira o código ou peça um novo.",
  "Login session expired, sign in again": "Sua etapa de login expirou. Entre novamente.",
  "Email already in use": "Este e-mail já está cadastrado.",
  "CPF already in use": "Este CPF já está cadastrado.",
  "Invalid CPF": "CPF inválido.",
  "Invalid birth date": "Data de nascimento inválida.",
  "Current password is incorrect": "Senha atual incorreta.",
  "CPF cannot be changed": "O CPF não pode ser alterado.",
  "Email domain not allowed": "E-mail inválido.",
};

/** Portuguese message for auth/profile errors, falling back to `fallback` + API detail. */
export function authErrorMessage(error: unknown, fallback: string): string {
  const detail = extractApiErrorDetail(error);
  if (detail && AUTH_MESSAGES[detail]) return AUTH_MESSAGES[detail];
  return withDetail(fallback, error);
}
