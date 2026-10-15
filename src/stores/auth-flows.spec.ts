import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAuthStore } from "./auth";

const http = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("../plugins/http", () => ({ default: http }));

beforeEach(() => {
  vi.useFakeTimers();
  setActivePinia(createPinia());
  localStorage.clear();
  http.post.mockReset();
});

async function run<T>(promise: Promise<T>) {
  await vi.runAllTimersAsync(); // login waits so its toast shows before the reload
  return promise;
}

describe("auth store flows", () => {
  it("signs in when no extra step is needed", async () => {
    http.post.mockResolvedValue({ data: { accessToken: "jwt" } });
    const auth = useAuthStore();
    const result = await run(auth.login("ana@example.com", "secret123"));
    expect(result).toEqual({ status: "authenticated" });
    expect(auth.token).toBe("jwt");
  });

  it("returns the challenge when two-factor is on, without a session", async () => {
    http.post.mockResolvedValue({ data: { twoFactorRequired: true, challengeToken: "ch" } });
    const auth = useAuthStore();
    expect(await auth.login("ana@example.com", "secret123")).toEqual({
      status: "two_factor",
      challengeToken: "ch",
    });
    expect(auth.token).toBe("");
  });

  it("asks unconfirmed accounts to confirm the e-mail", async () => {
    http.post.mockResolvedValue({ data: { emailVerificationRequired: true, email: "ana@example.com" } });
    const auth = useAuthStore();
    expect(await auth.login("Ana@example.com", "secret123")).toEqual({
      status: "verify_email",
      email: "ana@example.com",
    });
    expect(auth.token).toBe("");
  });

  it("exchanges the login code for a session", async () => {
    http.post.mockResolvedValue({ data: { accessToken: "jwt2" } });
    const auth = useAuthStore();
    await run(auth.verifyLogin("ch", "123456", "ana@example.com"));
    expect(http.post).toHaveBeenCalledWith(
      "/auth/login/verify",
      { challengeToken: "ch", code: "123456" },
      { skipToast: true }
    );
    expect(auth.token).toBe("jwt2");
  });

  it("registers without signing in", async () => {
    http.post.mockResolvedValue({ data: { verificationRequired: true } });
    const auth = useAuthStore();
    await auth.register({
      name: "Ana",
      email: "ana@example.com",
      password: "secret123",
      cpf: "52998224725",
      phone: "11987654321",
      birthDate: "1990-05-20",
    });
    expect(http.post.mock.calls[0][0]).toBe("/auth/register");
    expect(auth.token).toBe("");
  });
});
