import type { CardBrand } from "../utils/cardBrands";

/** BRL amount as a decimal string with up to 2 decimals, e.g. "1500.00" (backend `IsMoney`). */
export type Money = string;

/** Calendar date as "YYYY-MM-DD". */
export type ISODate = string;

export interface Tenant {
  id: string;
  name: string;
}

/** Debit cards only accept one-time purchases. */
export type CardType = "credit" | "debit";

export interface CreditCard {
  id: string;
  nickname: string;
  brand: CardBrand;
  last4: string;
  limitAmount: Money | null;
  cardType: CardType;
  active: boolean;
}

/** Expense category: defaults shared by every account (read-only) plus the user's own. */
export interface Category {
  id: string;
  name: string;
  /** Material Design Icons class, e.g. "mdi-silverware-fork-knife". */
  icon: string;
  isDefault: boolean;
}

/** `GET /reports/by-category` row: statement items of a month per category. */
export interface CategoryTotal {
  /** null = uncategorized items. */
  categoryId: string | null;
  name: string | null;
  icon: string | null;
  totalAmount: Money;
}

/** Card purchases go to the card's statements; Pix and cash are one-time and card-less. */
export type PaymentMethod = "card" | "pix" | "cash";

export interface Purchase {
  id: string;
  paymentMethod: PaymentMethod;
  /** null for Pix and cash. */
  creditCardId: string | null;
  tenantId: string;
  categoryId: string | null;
  description: string;
  purchaseDate: ISODate;
  totalAmount: Money;
  isInstallment: boolean;
  installmentsTotal: number | null;
  installmentsPaid: number;
}

export interface StatementItem {
  id: string;
  label: string;
  amount: Money;
  installmentNumber: number | null;
  /** Follows the purchase/subscription category, also in closed statements. */
  categoryId: string | null;
}

export interface Statement {
  id: string;
  creditCardId: string;
  year: number;
  month: number;
  closingDate: ISODate | null;
  dueDate: ISODate | null;
  totalAmount: Money;
  adjustmentAmount: Money;
  locked: boolean;
  paidAt: string | null;
  paidAmount: Money | null;
  items?: StatementItem[];
}

export interface Subscription {
  id: string;
  creditCardId: string;
  tenantId: string | null;
  categoryId: string | null;
  description: string;
  amount: Money;
  active: boolean;
}

export interface FixedExpense {
  id: string;
  tenantId: string | null;
  tenant?: Tenant | null;
  description: string;
  amount: Money;
}

export type IncomeType = "fixed" | "one_time";

export interface IncomeSource {
  id: string;
  tenantId: string | null;
  tenant?: Tenant | null;
  description: string;
  amount: Money;
  incomeType: IncomeType;
  /** Fixed: first day it counts (null = always); one-time: the day it is received. */
  startDate: ISODate | null;
  /** Fixed only: last day it counts (null = no end). */
  endDate: ISODate | null;
}

/** `GET /reports/by-tenant?year&month` row. */
export interface TenantReport {
  tenantId: string;
  tenantName: string;
  /** Statement purchases + Pix/cash purchases of the month. */
  purchasesTotal: Money;
  subscriptionsTotal: Money;
  /** purchasesTotal + subscriptionsTotal. */
  reportExpensesTotal: Money;
  fixedExpensesTotal: Money;
  incomeSourcesTotal: Money;
  /** income − fixed − (purchases + subscriptions). */
  accumulatedAmount: Money;
}

export type InvestmentType =
  | "fixed_income"
  | "stocks"
  | "real_estate_funds"
  | "funds"
  | "crypto"
  | "pension"
  | "other";

/** `GET /investments` row; values computed by the backend. */
export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  institution: string | null;
  /** Value today: last balance update + later contributions − withdrawals. */
  currentValue: Money;
  /** Contributions − withdrawals (all time). */
  investedTotal: Money;
  lastMovementDate: ISODate | null;
}

/** contribution/withdrawal move money; balance records the value reported on a date. */
export type MovementKind = "contribution" | "withdrawal" | "balance";

export interface InvestmentMovement {
  id: string;
  investmentId: string;
  kind: MovementKind;
  amount: Money;
  date: ISODate;
}

/** `GET /reports/investments?year&month`. */
export interface InvestmentsSummary {
  totalValue: Money;
  contributions: Money;
  withdrawals: Money;
  investmentsCount: number;
  history: { year: number; month: number; value: Money }[];
  byType: { type: InvestmentType; value: Money }[];
}

/** List endpoints called with `page` return one page plus the total count. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SelectOption<T> {
  label: string;
  value: T;
}

/** Signed-in user (`GET /users/me`). Profile fields are null on accounts created before they existed. */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  birthDate: ISODate | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
}
