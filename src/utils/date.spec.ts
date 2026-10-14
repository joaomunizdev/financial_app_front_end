import { describe, expect, it } from "vitest";
import {
  MONTHS,
  formatDateBR,
  formatPeriod,
  isValidYear,
  toDateInput,
  todayLocalISO,
} from "./date";

describe("date utils", () => {
  it("todayLocalISO uses the local calendar day, even late at night", () => {
    // 23:30 local time — toISOString() would roll over to the next day in UTC-3.
    expect(todayLocalISO(new Date(2025, 0, 31, 23, 30))).toBe("2025-01-31");
    expect(todayLocalISO(new Date(2025, 11, 1, 0, 5))).toBe("2025-12-01");
  });

  it("toDateInput normalizes API dates for <input type=date>", () => {
    expect(toDateInput("2025-08-10")).toBe("2025-08-10");
    expect(toDateInput("2025-08-10T00:00:00.000Z")).toBe("2025-08-10");
    expect(toDateInput(null)).toBe("");
    expect(toDateInput("invalid")).toBe("");
  });

  it("formatDateBR does not shift YYYY-MM-DD values", () => {
    expect(formatDateBR("2025-08-01")).toBe("01/08/2025");
    expect(formatDateBR(null)).toBe("—");
    expect(formatDateBR("not a date")).toBe("—");
  });

  it("isValidYear matches the API range", () => {
    expect(isValidYear(2025)).toBe(true);
    expect(isValidYear(1999)).toBe(false);
    expect(isValidYear(2101)).toBe(false);
    expect(isValidYear("")).toBe(false);
    expect(isValidYear(0)).toBe(false);
  });

  it("formatPeriod and MONTHS", () => {
    expect(formatPeriod(2025, 3)).toBe("03/2025");
    expect(MONTHS).toHaveLength(12);
    expect(MONTHS[0]).toEqual({ label: "janeiro", value: 1 });
  });
});
