import { describe, expect, it } from "vitest";
import { isBlockedEmailDomain } from "./email";

describe("isBlockedEmailDomain", () => {
  it("blocks fictitious/test domains and subdomains", () => {
    for (const e of ["a@teste.com", "a@Exemplo.com.br", "a@example.org", "a@mail.teste.com", "a@x.test", "a@test.com"]) {
      expect(isBlockedEmailDomain(e)).toBe(true);
    }
  });

  it("accepts real-looking domains", () => {
    for (const e of ["a@gmail.com", "a@empresa.com.br", "a@contestes.com", "a@latest.com"]) {
      expect(isBlockedEmailDomain(e)).toBe(false);
    }
  });
});
