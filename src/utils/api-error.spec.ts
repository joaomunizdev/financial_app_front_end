import { describe, expect, it } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { authErrorMessage, extractApiErrorDetail, withDetail } from "./api-error";

function apiError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("fail", "ERR", config, null, {
    status,
    data,
    statusText: "",
    headers: {},
    config,
  });
}

describe("extractApiErrorDetail", () => {
  it("returns the NestJS message for 4xx responses", () => {
    expect(extractApiErrorDetail(apiError(403, { message: "Tenant has purchases" }))).toBe(
      "Tenant has purchases"
    );
  });

  it("joins validation message arrays", () => {
    const err = apiError(400, { message: ["amount is invalid", "description too long"] });
    expect(extractApiErrorDetail(err)).toBe("amount is invalid; description too long");
  });

  it("hides internal details of 5xx responses", () => {
    expect(extractApiErrorDetail(apiError(500, { message: "QueryFailedError ..." }))).toBe(
      "Erro interno do servidor."
    );
  });

  it("explains rate limiting in Portuguese", () => {
    const err = apiError(429, { message: "Too many requests, try again later" });
    expect(extractApiErrorDetail(err)).toBe("Muitas tentativas em pouco tempo. Aguarde um pouco e tente de novo.");
    expect(authErrorMessage(err, "Não foi possível entrar.")).toBe(
      "Não foi possível entrar. Muitas tentativas em pouco tempo. Aguarde um pouco e tente de novo."
    );
  });

  it("reports network failures", () => {
    const err = new AxiosError("Network Error", "ERR_NETWORK");
    expect(extractApiErrorDetail(err)).toBe("Não foi possível conectar ao servidor.");
  });

  it("returns null for non-axios errors or bodies without message", () => {
    expect(extractApiErrorDetail(new Error("x"))).toBeNull();
    expect(extractApiErrorDetail(apiError(404, {}))).toBeNull();
  });

  it("withDetail appends the detail when available", () => {
    expect(withDetail("Falhou.", apiError(409, { message: "Already exists" }))).toBe(
      "Falhou. Already exists"
    );
    expect(withDetail("Falhou.", new Error("x"))).toBe("Falhou.");
  });

  it("translates known auth messages and falls back to the detail", () => {
    expect(authErrorMessage(apiError(409, { message: "CPF already in use" }), "Falhou.")).toBe(
      "Este CPF já está cadastrado."
    );
    expect(authErrorMessage(apiError(400, { message: "CPF cannot be changed" }), "Falhou.")).toBe(
      "O CPF não pode ser alterado."
    );
    expect(authErrorMessage(apiError(400, { message: "Something else" }), "Falhou.")).toBe(
      "Falhou. Something else"
    );
  });
});
