import type { CreditCard, Statement } from "../types/domain";

export type MonthTotal = {
  year: number;
  month: number;
  /** Short pt-BR month name, e.g. "out". */
  label: string;
  total: number;
};

export type LabeledTotal = { id: string; label: string; total: number };

function shortMonth(year: number, month: number): string {
  return new Date(year, month - 1, 1)
    .toLocaleString("pt-BR", { month: "short" })
    .replace(".", "");
}

function previousMonth(year: number, month: number, back = 1) {
  const index = year * 12 + (month - 1) - back;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/**
 * Statement totals summed per month for the `count` months ending at year/month
 * (oldest first). Months without statements are 0.
 */
export function monthlyTotals(
  statements: Statement[],
  year: number,
  month: number,
  count = 6
): MonthTotal[] {
  const sums = new Map<string, number>();
  for (const st of statements) {
    const key = `${st.year}-${st.month}`;
    sums.set(key, (sums.get(key) ?? 0) + Number(st.totalAmount || 0));
  }
  return Array.from({ length: count }, (_, i) => {
    const m = previousMonth(year, month, count - 1 - i);
    return {
      ...m,
      label: shortMonth(m.year, m.month),
      total: Math.round((sums.get(`${m.year}-${m.month}`) ?? 0) * 100) / 100,
    };
  });
}

/** Statement totals of one month per card, largest first, without zero rows. */
export function totalsByCard(
  statements: Statement[],
  cards: CreditCard[],
  year: number,
  month: number
): LabeledTotal[] {
  const sums = new Map<string, number>();
  for (const st of statements) {
    if (st.year !== year || st.month !== month) continue;
    sums.set(st.creditCardId, (sums.get(st.creditCardId) ?? 0) + Number(st.totalAmount || 0));
  }
  return [...sums.entries()]
    .filter(([, total]) => total !== 0)
    .map(([id, total]) => ({
      id,
      label: cards.find((c) => c.id === id)?.nickname ?? "Cartão",
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total);
}

/** Percent change from previous to current, or null when there is no base. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** The last `count` months ending at year/month, newest first, as select options. */
export function periodOptions(year: number, month: number, count = 12) {
  return Array.from({ length: count }, (_, i) => {
    const m = previousMonth(year, month, i);
    const name = new Date(m.year, m.month - 1, 1).toLocaleString("pt-BR", { month: "long" });
    return {
      value: `${m.year}-${m.month}`,
      label: `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${m.year}`,
      ...m,
    };
  });
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export type OnboardingStep = {
  key: "tenant" | "card" | "purchase" | "statement";
  title: string;
  description: string;
  to: string;
  done: boolean;
};

/** First-use checklist, in the order the app needs the data. */
export function onboardingSteps(counts: {
  tenants: number;
  cards: number;
  purchases: number;
  statements: number;
}): OnboardingStep[] {
  return [
    { key: "tenant", title: "Cadastre um responsável", description: "Quem participa das contas.", to: "/tenants", done: counts.tenants > 0 },
    { key: "card", title: "Cadastre um cartão", description: "Crédito ou débito.", to: "/credit-cards", done: counts.cards > 0 },
    { key: "purchase", title: "Lance uma compra", description: "À vista ou parcelada.", to: "/purchases", done: counts.purchases > 0 },
    { key: "statement", title: "Gere a primeira fatura", description: "Ela alimenta o Dashboard e os relatórios.", to: "/statements", done: counts.statements > 0 },
  ];
}
