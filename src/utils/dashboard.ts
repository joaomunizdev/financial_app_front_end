import type { CategoryTotal, Purchase, Statement } from "../types/domain";

const OTHERS = "Outros";

export type MonthTotal = {
  year: number;
  month: number;
  /** Short pt-BR month name, e.g. "out". */
  label: string;
  total: number;
};

/** One headline number of a SummaryStrip. */
export type SummaryItem = {
  label: string;
  value: string;
  icon: string;
  hint?: string;
  /** Colors the value for signed results (e.g. balance). */
  tone?: "positive" | "negative";
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
 * Statement totals plus Pix/cash purchases (by purchase month) summed per month
 * for the `count` months ending at year/month (oldest first). Empty months are 0.
 */
export function monthlyTotals(
  statements: Statement[],
  year: number,
  month: number,
  count = 6,
  directPurchases: Pick<Purchase, "purchaseDate" | "totalAmount">[] = []
): MonthTotal[] {
  const sums = new Map<string, number>();
  const add = (key: string, amount: string) =>
    sums.set(key, (sums.get(key) ?? 0) + Number(amount || 0));
  for (const st of statements) add(`${st.year}-${st.month}`, st.totalAmount);
  for (const p of directPurchases) {
    const [y, m] = p.purchaseDate.split("-").map(Number);
    add(`${y}-${m}`, p.totalAmount);
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

/**
 * Category totals for the "Onde você mais gastou" bars: the `limit` largest
 * categories, then one "Outros" row with the rest (the "Outros" category and
 * uncategorized items included).
 */
export function topCategories(rows: CategoryTotal[], limit = 6): LabeledTotal[] {
  const named = rows
    .filter((r) => r.categoryId && r.name !== OTHERS)
    .map((r) => ({ id: r.categoryId as string, label: r.name as string, total: Number(r.totalAmount) }))
    .sort((a, b) => b.total - a.total);
  const restCents = [
    ...named.slice(limit),
    ...rows
      .filter((r) => !r.categoryId || r.name === OTHERS)
      .map((r) => ({ total: Number(r.totalAmount) })),
  ].reduce((acc, r) => acc + Math.round(r.total * 100), 0);
  const top = named.slice(0, limit);
  return restCents > 0 ? [...top, { id: "others", label: OTHERS, total: restCents / 100 }] : top;
}

/** Percent change from previous to current, or null when there is no base. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** First and last day ("YYYY-MM-DD") of the `count` months ending at year/month. */
export function monthsRange(year: number, month: number, count = 6) {
  const first = previousMonth(year, month, count - 1);
  const lastDay = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    dateStart: `${first.year}-${pad(first.month)}-01`,
    dateEnd: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
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
