/** BRL amount as a decimal string with up to 2 decimals, e.g. "1500.00" (backend `IsMoney`). */
export type Money = string;

/** Calendar date as "YYYY-MM-DD". */
export type ISODate = string;

export interface Tenant {
  id: string;
  name: string;
}

export interface CreditCard {
  id: string;
  nickname: string;
  brand: string;
  last4: string;
  limitAmount: Money | null;
  active: boolean;
}

export interface Purchase {
  id: string;
  creditCardId: string;
  tenantId: string;
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
}

export interface TenantReport {
  tenantId: string;
  tenantName: string;
  reportExpensesTotal: Money;
}

export interface SelectOption<T> {
  label: string;
  value: T;
}
