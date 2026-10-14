import type { SelectOption } from "../types/domain";

export const MONTHS: SelectOption<number>[] = Array.from({ length: 12 }, (_, i) => ({
  label: new Date(2000, i, 1).toLocaleString("pt-BR", { month: "long" }),
  value: i + 1,
}));

export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;

export function isValidYear(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_YEAR &&
    value <= MAX_YEAR
  );
}

/** Today's date in the user's local timezone as "YYYY-MM-DD" (toISOString() would use UTC). */
export function todayLocalISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Normalizes an API date ("YYYY-MM-DD" or ISO timestamp) to the value expected by `<input type="date">`. */
export function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^\d{4}-\d{2}-\d{2}/.exec(value);
  return match ? match[0] : "";
}

/** Formats an API date for display. UTC keeps "YYYY-MM-DD" values from shifting to the previous day. */
export function formatDateBR(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatPeriod(year: number, month: number): string {
  return `${String(month).padStart(2, "0")}/${year}`;
}
