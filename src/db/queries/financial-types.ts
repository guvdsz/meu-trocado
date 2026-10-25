import type { Preferences } from "@/lib/preferences";
import type { TransactionCategory } from "@schemas/transaction/category";
import type { HistoryFilterValues } from "@schemas/transaction/history-filters";

export type Activity = {
  id: string;
  type: "income" | "expense" | "adjustment";
  description: string;
  amount: string;
  day: string;
  newBalance: string | null;
  category: TransactionCategory | null;
  recurrenceId?: string | null;
};
export type MonthlyTotal = { month: string; income: string; expense: string };
export type CategoryTotal = { category: TransactionCategory; amount: string };
export type TopExpense = {
  id: string;
  description: string;
  amount: string;
  day: string;
  category: TransactionCategory;
};
export type DashboardSnapshot = {
  preferences: Preferences;
  balance: string;
  version: number;
  income: string;
  expense: string;
  count: number;
  lastActivity: Activity | null;
  chart: MonthlyTotal[];
  categories: CategoryTotal[];
  previousExpense: string;
  topExpenses: TopExpense[];
};
export type HistoryFilters = HistoryFilterValues & {
  month: string;
};
export const HISTORY_PAGE_SIZE = 20;
