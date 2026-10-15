import { describe, expect, it } from "vitest";
import { formatCpf, formatPhone, isValidCpf, onlyDigits } from "./br";

describe("br utils", () => {
  it("validates CPF check digits like the backend", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224724")).toBe(false);
    expect(isValidCpf("000.000.000-00")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });

  it("masks CPF progressively", () => {
    expect(formatCpf("529")).toBe("529");
    expect(formatCpf("5299822")).toBe("529.982.2");
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
    expect(formatCpf("529.982.247-2599")).toBe("529.982.247-25");
  });

  it("masks mobile and landline phones", () => {
    expect(formatPhone("11")).toBe("(11");
    expect(formatPhone("119876")).toBe("(11) 9876");
    expect(formatPhone("1198765")).toBe("(11) 9876-5"); // reflows when complete
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
    expect(onlyDigits("(11) 98765-4321")).toBe("11987654321");
  });
});
