import { describe, expect, it } from "vitest";
import { isTokenExpired } from "./jwt";
import { fakeJwt } from "../test/helpers";

describe("isTokenExpired", () => {
  const now = 1_700_000_000_000;

  it("is false while exp is in the future", () => {
    expect(isTokenExpired(fakeJwt({ exp: now / 1000 + 60 }), now)).toBe(false);
  });

  it("is true once exp has passed", () => {
    expect(isTokenExpired(fakeJwt({ exp: now / 1000 - 1 }), now)).toBe(true);
  });

  it("treats tokens without exp as non-expiring", () => {
    expect(isTokenExpired(fakeJwt({ sub: "1" }), now)).toBe(false);
  });

  it("treats malformed tokens as expired", () => {
    expect(isTokenExpired("not-a-jwt", now)).toBe(true);
    expect(isTokenExpired("a.%%%.c", now)).toBe(true);
  });
});
