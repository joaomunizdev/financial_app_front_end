import { describe, expect, it } from "vitest";
import {
  greeting,
  monthlyTotals,
  onboardingSteps,
  percentChange,
  periodOptions,
  totalsByCard,
} from "./dashboard";
import type { CreditCard, Statement } from "../types/domain";

const st = (creditCardId: string, year: number, month: number, totalAmount: string) =>
  ({ id: `${creditCardId}-${year}-${month}`, creditCardId, year, month, totalAmount }) as Statement;

const cards = [
  { id: "a", nickname: "Principal" },
  { id: "b", nickname: "Viagem" },
] as CreditCard[];

const statements = [
  st("a", 2026, 10, "1000.50"),
  st("b", 2026, 10, "250.25"),
  st("a", 2026, 9, "800.00"),
  st("a", 2025, 12, "300.00"),
  st("b", 2026, 11, "999.00"),
];

describe("dashboard utils", () => {
  it("sums statement totals per month for the 6 months ending at the period", () => {
    const months = monthlyTotals(statements, 2026, 10);
    expect(months.map((m) => [m.year, m.month])).toEqual([
      [2026, 5], [2026, 6], [2026, 7], [2026, 8], [2026, 9], [2026, 10],
    ]);
    expect(months.map((m) => m.total)).toEqual([0, 0, 0, 0, 800, 1250.75]);
    expect(months[5].label).toBe("out");
  });

  it("crosses year boundaries", () => {
    const months = monthlyTotals(statements, 2026, 2, 3);
    expect(months.map((m) => `${m.month}/${m.year}`)).toEqual(["12/2025", "1/2026", "2/2026"]);
    expect(months[0].total).toBe(300);
  });

  it("ranks the month's totals by card, largest first", () => {
    expect(totalsByCard(statements, cards, 2026, 10)).toEqual([
      { id: "a", label: "Principal", total: 1000.5 },
      { id: "b", label: "Viagem", total: 250.25 },
    ]);
    expect(totalsByCard(statements, cards, 2026, 1)).toEqual([]);
  });

  it("computes the change against the previous month", () => {
    expect(percentChange(1250.75, 800)).toBe(56);
    expect(percentChange(500, 0)).toBeNull();
  });

  it("lists the last months as pt-BR options, newest first", () => {
    const options = periodOptions(2026, 1, 3);
    expect(options.map((o) => o.label)).toEqual([
      "Janeiro de 2026",
      "Dezembro de 2025",
      "Novembro de 2025",
    ]);
    expect(options[0].value).toBe("2026-1");
  });

  it("greets by time of day", () => {
    expect(greeting(new Date(2026, 0, 1, 9))).toBe("Bom dia");
    expect(greeting(new Date(2026, 0, 1, 15))).toBe("Boa tarde");
    expect(greeting(new Date(2026, 0, 1, 21))).toBe("Boa noite");
  });

  it("marks onboarding steps done from the existing data", () => {
    const steps = onboardingSteps({ tenants: 2, cards: 1, purchases: 0, statements: 0 });
    expect(steps.map((s) => [s.key, s.done])).toEqual([
      ["tenant", true],
      ["card", true],
      ["purchase", false],
      ["statement", false],
    ]);
    expect(steps.find((s) => !s.done)?.to).toBe("/purchases");
  });
});
